import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { type EmailMessage, setEmailSenderForTests } from "@/lib/email";
import type { OrgContext } from "@/lib/permissions";
import {
  checkinLink, getBookingPage, getCheckin, getGuide, publicPagesLink, quoteStay, requestBooking, setDirectBooking, submitCheckin,
} from "@/lib/services/guest-pages";
import { createReservation } from "@/lib/services/reservations";
import { getStayTax } from "@/lib/services/tax";
import { createGuest, createTenant, resetDatabase } from "./helpers";

const NOW = new Date("2026-10-08T09:00:00Z");
const tokenOf = (path: string) => path.split("/").pop()!;

describe("guest pages", () => {
  let ctx: OrgContext;
  let propertyId: string;
  let reservationId: string;
  const sent: EmailMessage[] = [];

  beforeAll(async () => {
    await resetDatabase();
    setEmailSenderForTests(async (m) => void sent.push(m));
    ctx = await createTenant("Guests");
    propertyId = (await db.property.create({
      data: {
        organizationId: ctx.organizationId, name: "Villa Elia", city: "Χανιά", country: "Ελλάδα", basePrice: 100, maxGuests: 4, ama: "00001234567",
        checkInTime: "15:00", checkOutTime: "11:00", houseRules: "Όχι κάπνισμα",
      },
    })).id;
    const guest = await createGuest(ctx, "Anna", "Müller");
    await db.guest.update({ where: { id: guest.id }, data: { country: "Germany" } });
    reservationId = (await createReservation(ctx, { propertyId, guestId: guest.id, guestsCount: 2, checkIn: "2026-10-20", checkOut: "2026-10-23", totalAmount: 300, source: "AIRBNB", confirmationCode: "HMXYZ12345" })).id;
  });
  afterAll(() => setEmailSenderForTests(null));

  it("online check-in fills the guest's identity for the AADE declaration", async () => {
    const { path } = await checkinLink(ctx, reservationId);
    expect((await checkinLink(ctx, reservationId)).path).toBe(path); // same link every time
    const token = tokenOf(path);
    const page = await getCheckin(token);
    expect(page).toMatchObject({ propertyName: "Villa Elia", guestFirstName: "Anna", language: "de", houseRules: "Όχι κάπνισμα", completed: false });

    await expect(submitCheckin(token, { idNumber: "C01X00T47", consent: true })).rejects.toMatchObject({ message: "mustAccept" });
    await expect(submitCheckin(token, { idNumber: "C01X00T47", acceptRules: true })).rejects.toMatchObject({ name: "ZodError" });
    await submitCheckin(token, { idNumber: "C01X00T47", phone: "+49 170 1234567", arrivalTime: "17:30", acceptRules: true, consent: true }, NOW);

    expect(await getCheckin(token)).toMatchObject({ completed: true });
    const r = await db.reservation.findUniqueOrThrow({ where: { id: reservationId }, include: { guest: true } });
    expect(r).toMatchObject({ arrivalTime: "17:30", guest: { idNumber: "C01X00T47", phone: "+49 170 1234567" } });
    expect(r.rulesAcceptedAt).not.toBeNull();
    const tax = await getStayTax(ctx, reservationId, new Date("2026-11-01T00:00:00Z"));
    expect(tax.declarationForm.missing).toEqual([]);
    expect(await getCheckin("nope")).toBeNull();
  });

  it("guest guide shows the notes in the guest's language", async () => {
    await db.aIMemory.createMany({
      data: [
        { organizationId: ctx.organizationId, propertyId, kind: "GUEST_INFO", content: "WLAN: Villa-Elia / Passwort: olive123", language: "de" },
        { organizationId: ctx.organizationId, propertyId, kind: "GUEST_INFO", content: "Wi-Fi: Villa-Elia / password: olive123", language: "en" },
      ],
    });
    const { guidePath } = await publicPagesLink(ctx, propertyId);
    const token = tokenOf(guidePath);
    expect((await getGuide(token, "de"))?.notes).toEqual(["WLAN: Villa-Elia / Passwort: olive123"]);
    expect((await getGuide(token, "fr"))?.notes).toHaveLength(2); // nothing in French: all notes
    expect(await getGuide(token, "en")).toMatchObject({ checkInTime: "15:00", houseRules: "Όχι κάπνισμα", directBooking: false });
  });

  it("direct booking: quote, availability, request as a pending direct reservation", async () => {
    const { bookingPath } = await publicPagesLink(ctx, propertyId);
    const token = tokenOf(bookingPath);
    expect(await getBookingPage(token, NOW)).toBeNull(); // off until the team turns it on
    await setDirectBooking(ctx, propertyId, true);

    const page = await getBookingPage(token, NOW);
    expect(page).toMatchObject({ basePrice: 100, maxGuests: 4, taken: [{ from: "2026-10-20", to: "2026-10-23" }] });

    expect(await quoteStay(token, { checkIn: "2026-10-21", checkOut: "2026-10-24" }, NOW)).toMatchObject({ available: false });
    expect(await quoteStay(token, { checkIn: "2026-10-25", checkOut: "2026-10-28" }, NOW)).toEqual({ nights: 3, rent: 300, climateFee: 24, total: 324, currency: "EUR", available: true });
    await expect(quoteStay(token, { checkIn: "2026-10-01", checkOut: "2026-10-03" }, NOW)).rejects.toMatchObject({ message: "dates" });

    sent.length = 0;
    const res = await requestBooking(token, { checkIn: "2026-10-25", checkOut: "2026-10-28", guestsCount: 2, name: "Jean Dupont", email: "jean@example.com", message: "Arrivée tard", language: "fr" }, "https://app.test", NOW);
    const r = await db.reservation.findUniqueOrThrow({ where: { id: res.reservationId }, include: { guest: true } });
    expect(r).toMatchObject({ source: "DIRECT", status: "PENDING", guest: { firstName: "Jean", lastName: "Dupont", language: "fr" } });
    expect(Number(r.totalAmount)).toBe(300);
    expect(sent.map((m) => m.subject)).toEqual([expect.stringContaining("Νέο αίτημα κράτησης"), "Réserver en direct: Villa Elia"]);
    await expect(requestBooking(token, { checkIn: "2026-10-21", checkOut: "2026-10-22", guestsCount: 1, name: "X Y", email: "x@example.com" }, "https://app.test", NOW)).rejects.toMatchObject({ message: "unavailable" });
  });
});
