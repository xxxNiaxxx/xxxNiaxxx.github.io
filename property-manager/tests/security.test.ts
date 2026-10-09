import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { BlockedUrlError, fetchPublicText, isPrivateAddress } from "@/lib/net/safe-fetch";
import type { OrgContext } from "@/lib/permissions";
import { rateLimited } from "@/lib/request";
import { registerAccount } from "@/lib/services/accounts";
import { checkinLink, getBookingPage, getGuide, publicPagesLink, rotatePublicLink, setDirectBooking, submitCheckin } from "@/lib/services/guest-pages";
import { createReservation } from "@/lib/services/reservations";
import { exportStaysCsv } from "@/lib/services/tax";
import { setRegistrationOpen } from "@/lib/services/waitlist";
import { createGuest, createTenant, resetDatabase } from "./helpers";

const last = (path: string) => path.split("/").pop()!;

describe("security", () => {
  let ctx: OrgContext;
  let propertyId: string;

  beforeAll(async () => {
    await resetDatabase();
    process.env.ADMIN_EMAILS = "boss@test.local";
    ctx = await createTenant("Sec");
    propertyId = (await db.property.create({ data: { organizationId: ctx.organizationId, name: "Flat", city: "X", country: "GR", basePrice: 50, maxGuests: 2 } })).id;
  });
  afterAll(() => {
    delete process.env.ADMIN_EMAILS;
  });

  it("the booking link never opens the guest guide, and links can be renewed", async () => {
    const { guidePath, bookingPath } = await publicPagesLink(ctx, propertyId);
    expect(last(guidePath)).not.toBe(last(bookingPath));
    await setDirectBooking(ctx, propertyId, true);
    expect(await getGuide(last(bookingPath), "en")).toBeNull();
    expect(await getBookingPage(last(guidePath))).toBeNull();
    const renewed = await rotatePublicLink(ctx, propertyId, "booking");
    expect(await getBookingPage(last(bookingPath))).toBeNull();
    expect(await getBookingPage(last(renewed.bookingPath))).not.toBeNull();
    expect(renewed.guidePath).toBe(guidePath);
  });

  it("a completed check-in cannot be overwritten through the link", async () => {
    const guest = await createGuest(ctx);
    const r = await createReservation(ctx, { propertyId, guestId: guest.id, guestsCount: 1, checkIn: "2027-03-01", checkOut: "2027-03-03", totalAmount: 100 });
    const token = last((await checkinLink(ctx, r.id)).path);
    await submitCheckin(token, { idNumber: "AB123456", consent: true });
    await expect(submitCheckin(token, { idNumber: "EVIL0000", consent: true })).rejects.toMatchObject({ message: "alreadyDone" });
    expect((await db.guest.findUniqueOrThrow({ where: { id: guest.id } })).idNumber).toBe("AB123456");
  });

  it("admin emails cannot sign up, and a made-up link is refused before anything else", async () => {
    await setRegistrationOpen(true);
    await expect(registerAccount({ name: "X", email: "boss@test.local", password: "password123", organizationName: "X" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const user = await db.user.findFirstOrThrow();
    await expect(registerAccount({ name: "X", email: user.email, password: "password123", invite: "made-up" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await setRegistrationOpen(false);
  });

  it("calendar fetches only go to public https addresses", async () => {
    expect(isPrivateAddress("10.1.2.3")).toBe(true);
    expect(isPrivateAddress("169.254.169.254")).toBe(true);
    expect(isPrivateAddress("::ffff:192.168.1.5")).toBe(true);
    expect(isPrivateAddress("::1")).toBe(true);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
    for (const url of ["http://example.com/a.ics", "https://127.0.0.1/a.ics", "https://localhost/a.ics", "https://[::1]/a.ics"]) {
      await expect(fetchPublicText(url, { maxBytes: 1000, timeoutMs: 2000 })).rejects.toBeInstanceOf(BlockedUrlError);
    }
  });

  it("rate limits count across calls", async () => {
    const key = `test:${Date.now()}`;
    for (let i = 0; i < 3; i++) expect(await rateLimited(key, 3, 60_000)).toBe(false);
    expect(await rateLimited(key, 3, 60_000)).toBe(true);
  });

  it("exports never start a cell with a formula", async () => {
    const guest = await db.guest.create({ data: { organizationId: ctx.organizationId, firstName: "=HYPERLINK(\"x\")", lastName: "Y" } });
    await createReservation(ctx, { propertyId, guestId: guest.id, guestsCount: 1, checkIn: "2026-05-01", checkOut: "2026-05-02", totalAmount: 50 });
    const csv = await exportStaysCsv(ctx, 2026);
    expect(csv).toContain(`"'=HYPERLINK(""x"") Y"`);
  });
});
