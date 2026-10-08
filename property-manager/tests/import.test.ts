import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { detectAmountMode, roomAndCommission } from "@/lib/import/amounts";
import { autoMap, buildRows, detectDateOrder, parseAmount, parseDate } from "@/lib/import/parse";
import type { OrgContext } from "@/lib/permissions";
import { importReservations } from "@/lib/services/reservation-import";
import { updateTaxSettings } from "@/lib/services/tax";
import { createTenant, resetDatabase } from "./helpers";

describe("parsing exports", () => {
  it("maps Booking.com and Airbnb columns (English and Greek)", () => {
    const booking = ["Book number", "Booked by", "Guest name(s)", "Check-in", "Check-out", "Booked on", "Status", "Rooms", "People", "Price", "Commission %", "Commission amount", "Payment status", "Remarks", "Booker country", "Unit type", "Phone number"];
    const m = autoMap(booking);
    expect(m).toMatchObject({ externalId: 0, guestName: 2, checkIn: 3, checkOut: 4, status: 6, guests: 8, amount: 9, commissionPercent: 10, commission: 11, notes: 13, country: 14, listing: 15, phone: 16 });

    const greek = autoMap(["Αριθμός κράτησης", "Όνομα επισκέπτη", "Άφιξη", "Αναχώρηση", "Κατάσταση", "Άτομα", "Τιμή", "Ποσό προμήθειας", "Τύπος μονάδας"]);
    expect(greek).toMatchObject({ externalId: 0, guestName: 1, checkIn: 2, checkOut: 3, status: 4, guests: 5, amount: 6, commission: 7, listing: 8 });

    const airbnb = autoMap(["Confirmation code", "Status", "Guest name", "Contact", "# of adults", "# of children", "# of infants", "Start date", "End date", "# of nights", "Booked", "Listing", "Earnings"]);
    expect(airbnb).toMatchObject({ externalId: 0, status: 1, guestName: 2, phone: 3, guests: 4, children: 5, checkIn: 7, checkOut: 8, listing: 11, amount: 12 });
  });

  it("reads amounts and dates in the usual formats", () => {
    expect(parseAmount("425,53 EUR")).toBe(425.53);
    expect(parseAmount("€ 1.234,56")).toBe(1234.56);
    expect(parseAmount("1,234.56")).toBe(1234.56);
    expect(parseAmount("EUR 1,234")).toBe(1234);
    expect(parseAmount(55.19)).toBe(55.19);
    expect(parseAmount("")).toBeNaN();

    expect(detectDateOrder(["11/10/2026", "18/10/2026"])).toBe("DMY");
    expect(detectDateOrder(["10/11/2026", "10/18/2026"])).toBe("MDY");
    expect(parseDate("2026-10-11", "DMY")).toBe("2026-10-11");
    expect(parseDate("11/10/2026", "DMY")).toBe("2026-10-11");
    expect(parseDate("10/11/2026", "MDY")).toBe("2026-10-11");
    expect(parseDate("11 Οκτ 2026", "DMY")).toBe("2026-10-11");
    expect(parseDate("Oct 11, 2026", "DMY")).toBe("2026-10-11");
    expect(parseDate(new Date(2026, 9, 11), "DMY")).toBe("2026-10-11");
    expect(parseDate("31/02/2026", "DMY")).toBeNull();
  });

  it("builds rows with statuses and problems", () => {
    const rows = buildRows(
      [
        ["4100", "Maria Papadopoulou", "2026-10-11", "2026-10-18", "ok", "2", "425,53 EUR", "55,19"],
        ["4101", "John Smith", "2026-09-01", "2026-09-03", "cancelled_by_guest", "2", "180", "0"],
        ["", "", "", "", "", "", "", ""],
        ["4102", "", "bad", "2026-09-03", "ok", "2", "x", ""],
      ],
      { externalId: 0, guestName: 1, checkIn: 2, checkOut: 3, status: 4, guests: 5, amount: 6, commission: 7 },
      "DMY",
      "2026-10-08",
    );
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ line: 2, externalId: "4100", amount: 425.53, commission: 55.19, status: "CONFIRMED", problems: [] });
    expect(rows[1]).toMatchObject({ status: "CANCELLED" });
    expect(rows[2].problems.length).toBeGreaterThan(1);
  });

  it("works out what the amount means from the commission", () => {
    // Booking: 425,53 total with 56 € ΤΑΚΚ and 55,19 commission → guest total.
    expect(detectAmountMode([{ amount: 425.53, commission: 55.19, commissionPercent: 15, climateFee: 56 }], { ratePercent: 15, regime: "BUSINESS", fallback: "ROOM" }))
      .toEqual({ mode: "GUEST_TOTAL", detected: true });
    // Airbnb payout: 340 after 60 commission (15% of 400).
    expect(detectAmountMode([{ amount: 340, commission: 60, commissionPercent: null, climateFee: 16 }], { ratePercent: 15, regime: "INDIVIDUAL", fallback: "ROOM" }).mode).toBe("PAYOUT");
    expect(roomAndCommission("PAYOUT", 340, { commission: null, climateFee: 0, ratePercent: 15, regime: "INDIVIDUAL" })).toEqual({ room: 400, commission: 60 });
  });
});

describe("importing reservations", () => {
  let ctx: OrgContext;
  let propertyId: string;

  beforeAll(async () => {
    await resetDatabase();
    ctx = await createTenant("Import");
    propertyId = (await db.property.create({
      data: { organizationId: ctx.organizationId, name: "Διαμέρισμα", city: "Χανιά", country: "Ελλάδα", basePrice: 60, maxGuests: 3, ama: "00001111111", kind: "APARTMENT" },
    })).id;
    await updateTaxSettings(ctx, { taxRegime: "BUSINESS" });
  });

  const row = (over: Record<string, unknown> = {}) => ({
    line: 2, externalId: "5001", propertyId, guestName: "Maria Papadopoulou", checkIn: "2026-10-11", checkOut: "2026-10-18",
    guestsCount: 2, amount: 425.53, commission: 55.19, commissionPercent: 15, status: "CONFIRMED", country: "gr", ...over,
  });

  it("creates reservations, guests and commission from a Booking export", async () => {
    const res = await importReservations(ctx, { source: "BOOKING_COM", amountMode: "GUEST_TOTAL", rows: [row(), row({ line: 3, externalId: "5002", guestName: "Hans Müller", checkIn: "2026-10-20", checkOut: "2026-10-22", guestsCount: 5, amount: 200, commission: null })] });
    expect(res).toMatchObject({ created: 2, updated: 0, failed: 0 });
    const r = await db.reservation.findFirstOrThrow({ where: { organizationId: ctx.organizationId, externalId: "5001" }, include: { guest: true } });
    expect(Number(r.totalAmount)).toBe(369.53);
    expect(Number(r.commission)).toBe(55.19);
    expect(r).toMatchObject({ source: "BOOKING_COM", confirmationCode: "5001", guest: { firstName: "Maria", lastName: "Papadopoulou", country: "gr" } });
    const hans = await db.reservation.findFirstOrThrow({ where: { organizationId: ctx.organizationId, externalId: "5002" } });
    expect(hans.guestsCount).toBe(3); // capped at the property's maximum
    expect(Number(hans.totalAmount)).toBe(184); // 200 − 2 × 8 € ΤΑΚΚ
    expect(Number(hans.commission)).toBeGreaterThan(0); // automatic 15%
  });

  it("re-importing updates instead of duplicating; free cancellations carry no rent", async () => {
    const res = await importReservations(ctx, { source: "BOOKING_COM", amountMode: "GUEST_TOTAL", rows: [row({ status: "CANCELLED", commission: 0 })] });
    expect(res).toMatchObject({ created: 0, updated: 1 });
    const all = await db.reservation.findMany({ where: { organizationId: ctx.organizationId, externalId: "5001" } });
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ status: "CANCELLED" });
    expect(Number(all[0].totalAmount)).toBe(0);
    expect(await db.guest.count({ where: { organizationId: ctx.organizationId, lastName: "Papadopoulou" } })).toBe(1);
  });

  it("reports problems per row without stopping the rest", async () => {
    const other = await createTenant("Other");
    const foreign = await db.property.create({ data: { organizationId: other.organizationId, name: "X", city: "X", country: "X", basePrice: 1 } });
    const res = await importReservations(ctx, {
      source: "AIRBNB", amountMode: "PAYOUT",
      rows: [
        row({ line: 2, externalId: "HM1", amount: 340, commission: null, checkIn: "2026-11-01", checkOut: "2026-11-05" }),
        row({ line: 3, externalId: "HM2", checkIn: "2026-11-02", checkOut: "2026-11-04" }), // overlaps HM1
        row({ line: 4, externalId: "HM3", propertyId: foreign.id }),
      ],
    });
    expect(res).toMatchObject({ created: 1, failed: 2 });
    expect(res.results.find((r) => r.line === 3)?.message).toMatch(/συμπίπτουν/);
    expect(res.results.find((r) => r.line === 4)?.message).toBe("Το ακίνητο δεν βρέθηκε");
  });
});
