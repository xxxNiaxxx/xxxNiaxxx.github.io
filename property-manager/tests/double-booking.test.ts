import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { type EmailMessage, setEmailSenderForTests } from "@/lib/email";
import type { OrgContext } from "@/lib/permissions";
import { dismissConflict, isMirror, listOpenConflicts } from "@/lib/services/calendar-conflicts";
import { syncFeed } from "@/lib/services/calendar-feeds";
import { getDashboard } from "@/lib/services/dashboard";
import { cancelReservation, createReservation } from "@/lib/services/reservations";
import { createGuest, createTenant, resetDatabase } from "./helpers";

const NOW = new Date("2026-10-08T09:00:00Z");
const booking = (events: { uid: string; start: string; end: string }[], summary = "CLOSED - Not available") =>
  ["BEGIN:VCALENDAR", "VERSION:2.0",
    ...events.flatMap((e) => ["BEGIN:VEVENT", `DTSTART;VALUE=DATE:${e.start.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${e.end.replace(/-/g, "")}`, `UID:${e.uid}`, `SUMMARY:${summary}`, "END:VEVENT"]),
    "END:VCALENDAR"].join("\r\n");
const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("double bookings from platform calendars", () => {
  let ctx: OrgContext;
  let propertyId: string;
  let airbnbStay: string;
  const sent: EmailMessage[] = [];

  beforeAll(async () => {
    await resetDatabase();
    setEmailSenderForTests(async (m) => void sent.push(m));
    ctx = await createTenant("Double");
    propertyId = (await db.property.create({ data: { organizationId: ctx.organizationId, name: "Zenios Rafina", city: "Ραφήνα", country: "Ελλάδα", basePrice: 80, maxGuests: 4 } })).id;
    const guest = await createGuest(ctx, "Danai", "K");
    airbnbStay = (await createReservation(ctx, { propertyId, guestId: guest.id, guestsCount: 2, checkIn: "2026-10-10", checkOut: "2026-10-15", totalAmount: 400, source: "AIRBNB" })).id;
    await createReservation(ctx, { propertyId, guestId: guest.id, guestsCount: 2, checkIn: "2026-10-15", checkOut: "2026-10-17", totalAmount: 160, source: "DIRECT" });
  });
  afterAll(() => setEmailSenderForTests(null));

  it("tells mirrored blocks apart from real overlaps", () => {
    const stays = [{ id: "a", checkIn: d("2026-10-10"), checkOut: d("2026-10-15") }, { id: "b", checkIn: d("2026-10-15"), checkOut: d("2026-10-17") }];
    expect(isMirror({ start: "2026-10-10", end: "2026-10-15" }, [stays[0]])).toBe(true);
    expect(isMirror({ start: "2026-10-10", end: "2026-10-17" }, stays)).toBe(true); // back-to-back stays in one block
    expect(isMirror({ start: "2026-10-11", end: "2026-10-13" }, [stays[0]])).toBe(false);
    expect(isMirror({ start: "2026-10-09", end: "2026-10-12" }, [stays[0]])).toBe(false);
  });

  it("flags a Booking stay inside an Airbnb stay, emails the owner once, and resolves it when it goes", async () => {
    const feed = await db.calendarFeed.create({ data: { organizationId: ctx.organizationId, propertyId, source: "BOOKING_COM", url: "https://admin.booking.com/ical/1.ics" } });
    let calendar = booking([
      { uid: "mirror", start: "2026-10-10", end: "2026-10-17" }, // our own dates sent to Booking
      { uid: "b1", start: "2026-10-12", end: "2026-10-14" }, // a real double booking
    ]);
    const fetchText = async () => calendar;
    expect(await syncFeed(feed, NOW, fetchText)).toMatchObject({ created: 0, skipped: 2 });

    const open = await listOpenConflicts(ctx);
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ propertyName: "Zenios Rafina", sourceLabel: "Booking.com", start: "2026-10-12", end: "2026-10-14" });
    expect(open[0].overlaps).toMatchObject([{ id: airbnbStay, sourceLabel: "Airbnb" }]);
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toContain("Πιθανή διπλοκράτηση");

    const dash = await getDashboard(ctx, NOW);
    expect(dash.attention[0]).toMatchObject({ kind: "DOUBLE_BOOKING", severity: "high", href: `/reservations/${airbnbStay}` });
    expect((await listOpenConflicts(ctx, { reservationId: airbnbStay }))).toHaveLength(1);

    // Same calendar again: no second email.
    await syncFeed(feed, NOW, fetchText);
    expect(sent).toHaveLength(1);

    // The Booking stay was cancelled there: the conflict closes itself.
    calendar = booking([{ uid: "mirror", start: "2026-10-10", end: "2026-10-17" }]);
    await syncFeed(feed, NOW, fetchText);
    expect(await listOpenConflicts(ctx)).toHaveLength(0);
  });

  it("can be dismissed, and closes when the other stay is cancelled", async () => {
    const feed = await db.calendarFeed.create({ data: { organizationId: ctx.organizationId, propertyId, source: "VRBO", url: "https://www.vrbo.com/ical/2.ics" } });
    const calendar = booking([{ uid: "v1", start: "2026-10-13", end: "2026-10-16" }], "Reserved");
    await syncFeed(feed, NOW, async () => calendar);
    const [c] = await listOpenConflicts(ctx);
    expect(c.overlaps).toHaveLength(2);
    await dismissConflict(ctx, c.id);
    expect(await listOpenConflicts(ctx)).toHaveLength(0);

    await syncFeed(feed, NOW, async () => booking([{ uid: "v2", start: "2026-10-11", end: "2026-10-12" }], "Reserved"));
    expect(await listOpenConflicts(ctx)).toHaveLength(1);
    await cancelReservation(ctx, airbnbStay);
    expect(await syncFeed(feed, NOW, async () => booking([{ uid: "v2", start: "2026-10-11", end: "2026-10-12" }], "Reserved"))).toMatchObject({ created: 1 });
    expect(await listOpenConflicts(ctx)).toHaveLength(0);
  });
});
