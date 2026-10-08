import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { detectAmountMode, roomAndCommission } from "@/lib/import/amounts";
import { autoMap, buildRows, detectDateOrder, parseAmount, parseDate } from "@/lib/import/parse";
import type { OrgContext } from "@/lib/permissions";
import { importReservations } from "@/lib/services/reservation-import";
import { getReservationDetails } from "@/lib/services/reservations";
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

  it("counts children only on top of an adults column", () => {
    const people = buildRows([["3", "1"]], { guests: 0, children: 1 }, "DMY", "2026-10-08", ["People", "Children"]);
    const adults = buildRows([["2", "1"]], { guests: 0, children: 1 }, "DMY", "2026-10-08", ["# of adults", "# of children"]);
    expect(people[0].guestsCount).toBe(3);
    expect(adults[0].guestsCount).toBe(3);
  });

  it("works out what the amount means from the commission", () => {
    // Real Booking export: "Price" 209,10 with 31,37 commission is the commissionable amount → room 210,03.
    expect(detectAmountMode([{ amount: 209.1, commission: 31.37, commissionPercent: 15, climateFee: 40 }], { ratePercent: 15, source: "BOOKING_COM" }))
      .toEqual({ mode: "COMMISSIONABLE", detected: true });
    expect(roomAndCommission("COMMISSIONABLE", 209.1, { commission: 31.37, climateFee: 40, ratePercent: 15, source: "BOOKING_COM" })).toEqual({ room: 210.03, commission: 31.37 });
    expect(roomAndCommission("COMMISSIONABLE", 367.9, { commission: null, climateFee: 56, ratePercent: 15, source: "BOOKING_COM" })).toEqual({ room: 369.53, commission: 55.19 });
    // Booking total with ΤΑΚΚ: 425,53 with 55,19 → guest total.
    expect(detectAmountMode([{ amount: 425.53, commission: 55.19, commissionPercent: 15, climateFee: 56 }], { ratePercent: 15, source: "BOOKING_COM" }).mode).toBe("GUEST_TOTAL");
    // Without commission data Booking defaults to its "Price" meaning, Airbnb to payout.
    expect(detectAmountMode([{ amount: 209.1, commission: null, commissionPercent: null, climateFee: 40 }], { ratePercent: 15, source: "BOOKING_COM" }).mode).toBe("COMMISSIONABLE");
    // Airbnb payout: 340 after 60 commission (15% of 400).
    expect(detectAmountMode([{ amount: 340, commission: 60, commissionPercent: null, climateFee: 16 }], { ratePercent: 15, source: "AIRBNB" }).mode).toBe("PAYOUT");
    expect(roomAndCommission("PAYOUT", 340, { commission: null, climateFee: 0, ratePercent: 15, source: "AIRBNB" })).toEqual({ room: 400, commission: 60 });
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

  it("matches a reservation typed in by hand with the booking number", async () => {
    const guestId = (await db.guest.create({ data: { organizationId: ctx.organizationId, firstName: "Tabita", lastName: "Ghimire" } })).id;
    const manual = await db.reservation.create({
      data: {
        organizationId: ctx.organizationId, propertyId, guestId, source: "BOOKING_COM", confirmationCode: "6444699988",
        checkIn: new Date("2027-01-10"), checkOut: new Date("2027-01-15"), guestsCount: 2, totalAmount: 209.1, commission: 0,
      },
    });
    const res = await importReservations(ctx, {
      source: "BOOKING_COM", amountMode: "COMMISSIONABLE",
      rows: [row({ line: 5, externalId: "6444699988", guestName: "Tabita Ghimire", checkIn: "2027-01-10", checkOut: "2027-01-15", amount: 209.1, commission: 31.37 })],
    });
    expect(res).toMatchObject({ created: 0, updated: 1 });
    const r = await db.reservation.findUniqueOrThrow({ where: { id: manual.id } });
    expect(r.externalId).toBe("6444699988");
    expect(Number(r.totalAmount)).toBe(210.03);
    expect(Number(r.commission)).toBe(31.37);
  });

  it("keeps every column of the export and completes the guest's contact details", async () => {
    const details = { "Book number": "7001", "Booked on": "2026-09-01", "Payment status": "Paid online", "Travel purpose": "Leisure", "Phone number": "+30 690 000 0000", "Children's ages": "4, 7" };
    const res = await importReservations(ctx, {
      source: "BOOKING_COM", amountMode: "GUEST_TOTAL",
      rows: [row({ line: 9, externalId: "7001", guestName: "Eva Novak", checkIn: "2026-12-01", checkOut: "2026-12-03", amount: 104, commission: null, phone: "+30 690 000 0000", details })],
    });
    expect(res.created).toBe(1);
    const r = await db.reservation.findFirstOrThrow({ where: { externalId: "7001" }, include: { guest: true } });
    expect(r.guest.phone).toBe("+30 690 000 0000");
    const d = await getReservationDetails(ctx, r.id);
    expect(d.platform?.source).toBe("BOOKING_COM");
    expect(d.platform?.fields).toEqual(expect.arrayContaining([
      { label: "Ημερομηνία κράτησης", value: "2026-09-01" },
      { label: "Κατάσταση πληρωμής", value: "Paid online" },
      { label: "Σκοπός ταξιδιού", value: "Leisure" },
      { label: "Ηλικίες παιδιών", value: "4, 7" },
    ]));
  });
});
