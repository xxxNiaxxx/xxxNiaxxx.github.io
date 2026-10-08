import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { buildIcs, classifyEvent, parseIcs } from "@/lib/ical/ics";
import type { OrgContext } from "@/lib/permissions";
import { addFeed, exportIcs, rotateExportToken, syncFeed } from "@/lib/services/calendar-feeds";
import { importReservations } from "@/lib/services/reservation-import";
import { createTenant, resetDatabase } from "./helpers";

const NOW = new Date("2026-10-08T09:00:00Z");

const airbnb = (events: { uid: string; start: string; end: string; summary?: string; code?: string }[]) =>
  ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Airbnb Inc//Hosting Calendar 1.0//EN",
    ...events.flatMap((e) => [
      "BEGIN:VEVENT",
      `DTEND;VALUE=DATE:${e.end.replace(/-/g, "")}`,
      `DTSTART;VALUE=DATE:${e.start.replace(/-/g, "")}`,
      `UID:${e.uid}`,
      ...(e.code ? [`DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/details/${e.code}\\nPhone Number (Last 4 Digits): 4821`] : []),
      `SUMMARY:${e.summary ?? "Reserved"}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR"].join("\r\n");

describe("iCal format", () => {
  it("reads Airbnb and Booking events, folded lines included", () => {
    const text = "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261011\r\nDTEND;VALUE=DATE:20261018\r\nUID:abc@booking\r\nSUMMARY:CLOSED - Not av\r\n ailable\r\nEND:VEVENT\r\nEND:VCALENDAR";
    expect(parseIcs(text)).toEqual([{ uid: "abc@booking", start: "2026-10-11", end: "2026-10-18", summary: "CLOSED - Not available", description: "" }]);
    const [stay, block] = parseIcs(airbnb([{ uid: "1", start: "2026-10-11", end: "2026-10-14", code: "HMABC12345" }, { uid: "2", start: "2026-10-20", end: "2026-10-22", summary: "Airbnb (Not available)" }]));
    expect(classifyEvent("AIRBNB", stay)).toEqual({ stay: true, code: "HMABC12345", phoneLast4: "4821" });
    expect(classifyEvent("AIRBNB", block).stay).toBe(false);
    expect(classifyEvent("BOOKING_COM", parseIcs(text)[0]).stay).toBe(true);
  });

  it("writes an all-day calendar that reads back", () => {
    const ics = buildIcs("Villa", [{ uid: "r1@x", start: "2026-10-11", end: "2026-10-14", summary: "Μη διαθέσιμο" }], NOW);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261011");
    expect(parseIcs(ics)).toMatchObject([{ uid: "r1@x", start: "2026-10-11", end: "2026-10-14" }]);
  });
});

describe("calendar sync", () => {
  let ctx: OrgContext;
  let propertyId: string;

  beforeAll(async () => {
    await resetDatabase();
    ctx = await createTenant("Cal");
    propertyId = (await db.property.create({
      data: { organizationId: ctx.organizationId, name: "Studio", city: "Χανιά", country: "Ελλάδα", basePrice: 60, ama: "00001111111", kind: "APARTMENT" },
    })).id;
  });

  it("creates stays, follows date changes and cancels stays that disappear", async () => {
    const feed = await db.calendarFeed.create({ data: { organizationId: ctx.organizationId, propertyId, source: "AIRBNB", url: "https://www.airbnb.com/calendar/ical/1.ics" } });
    let calendar = airbnb([
      { uid: "a1", start: "2026-10-11", end: "2026-10-14", code: "HMAAA11111" },
      { uid: "a2", start: "2026-10-20", end: "2026-10-22" },
      { uid: "a3", start: "2026-10-25", end: "2026-10-27", summary: "Airbnb (Not available)" },
      { uid: "old", start: "2026-05-01", end: "2026-05-03" },
    ]);
    const fetchText = async () => calendar;

    expect(await syncFeed(feed, NOW, fetchText)).toMatchObject({ created: 2, updated: 0, cancelled: 0 });
    const first = await db.reservation.findFirstOrThrow({ where: { icalUid: "a1" }, include: { guest: true } });
    expect(first).toMatchObject({ source: "AIRBNB", externalId: "HMAAA11111", status: "CONFIRMED", calendarFeedId: feed.id, guest: { firstName: "Επισκέπτης", lastName: "Airbnb" } });
    expect(Number(first.totalAmount)).toBe(0);
    expect(first.notes).toContain("…4821");

    // Same calendar again: nothing changes.
    expect(await syncFeed(feed, NOW, fetchText)).toMatchObject({ created: 0, updated: 0, cancelled: 0 });

    // a1 moved by a day, a2 disappeared (cancelled on Airbnb).
    calendar = airbnb([{ uid: "a1", start: "2026-10-12", end: "2026-10-15", code: "HMAAA11111" }]);
    expect(await syncFeed(feed, NOW, fetchText)).toMatchObject({ updated: 1, cancelled: 1 });
    expect(await db.reservation.findFirstOrThrow({ where: { icalUid: "a2" } })).toMatchObject({ status: "CANCELLED" });
    const moved = await db.reservation.findFirstOrThrow({ where: { icalUid: "a1" } });
    expect(moved.checkIn.toISOString().slice(0, 10)).toBe("2026-10-12");

    // A cancelled stay that shows up again is not revived; the error of a bad link is kept.
    calendar = airbnb([{ uid: "a1", start: "2026-10-12", end: "2026-10-15" }, { uid: "a2", start: "2026-10-20", end: "2026-10-22" }]);
    expect(await syncFeed(feed, NOW, fetchText)).toMatchObject({ created: 0 });
    const failed = await syncFeed(feed, NOW, async () => "<html>login</html>");
    expect(failed.error).toMatch(/iCal/);
    expect((await db.calendarFeed.findUniqueOrThrow({ where: { id: feed.id } })).lastError).toMatch(/iCal/);
  });

  it("the booking export fills in a Booking calendar stay instead of duplicating it", async () => {
    const feed = await db.calendarFeed.create({ data: { organizationId: ctx.organizationId, propertyId, source: "BOOKING_COM", url: "https://admin.booking.com/hotel/ical.ics?t=1" } });
    const booking = "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261101\r\nDTEND;VALUE=DATE:20261105\r\nUID:b1@booking.com\r\nSUMMARY:CLOSED - Not available\r\nEND:VEVENT\r\nEND:VCALENDAR";
    expect(await syncFeed(feed, NOW, async () => booking)).toMatchObject({ created: 1 });

    const res = await importReservations(ctx, {
      source: "BOOKING_COM", amountMode: "GUEST_TOTAL",
      rows: [{ line: 2, externalId: "5523009", propertyId, guestName: "Anna Kowalska", checkIn: "2026-11-01", checkOut: "2026-11-05", guestsCount: 2, amount: 208, commission: null, status: "CONFIRMED" }],
    });
    expect(res).toMatchObject({ created: 0, updated: 1 });
    const stays = await db.reservation.findMany({ where: { propertyId, checkIn: new Date("2026-11-01") }, include: { guest: true } });
    expect(stays).toHaveLength(1);
    expect(stays[0]).toMatchObject({ externalId: "5523009", calendarFeedId: feed.id, guest: { lastName: "Kowalska" } });
    expect(Number(stays[0].totalAmount)).toBe(200); // 208 − 4 × 2 € ΤΑΚΚ (November)
  });

  it("exports the property's stays on a secret link; feeds need admins and https", async () => {
    const { exportPath } = await rotateExportToken(ctx, propertyId);
    const ics = await exportIcs(exportPath.split("/").at(-1)!, NOW);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(parseIcs(ics!).some((e) => e.start === "2026-10-12")).toBe(true);
    expect(ics).not.toContain("Kowalska");
    expect(await exportIcs("nope", NOW)).toBeNull();

    await expect(addFeed({ ...ctx, role: "MEMBER" }, propertyId, { source: "AIRBNB", url: "https://www.airbnb.com/x.ics" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(addFeed(ctx, propertyId, { source: "AIRBNB", url: "http://localhost/x.ics" })).rejects.toMatchObject({ name: "ZodError" });
    await expect(addFeed(ctx, propertyId, { source: "AIRBNB", url: "https://127.0.0.1/x.ics" })).rejects.toMatchObject({ name: "ZodError" });
  });
});
