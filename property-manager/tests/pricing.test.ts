import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import type { OrgContext } from "@/lib/permissions";
import { createReservation, updateReservation } from "@/lib/services/reservations";
import { getAnnualReport, getStayTax, updateTaxSettings } from "@/lib/services/tax";
import { businessIncomeTax, commissionBase, commissionFor, roomFromCommissionBase } from "@/lib/tax/gr";
import { createGuest, createTenant, resetDatabase } from "./helpers";

const NOW = new Date("2026-10-20T09:00:00Z");

describe("Booking.com price breakdown", () => {
  it("matches Booking's commission base and 15% commission (VAT 13% + 0,5% included)", () => {
    // Real Booking.com breakdowns: room price → commission base → commission.
    expect(commissionBase(369.53, "BOOKING_COM")).toBe(367.9);
    expect(commissionBase(210.03, "BOOKING_COM")).toBe(209.1);
    expect(commissionBase(233.28, "BOOKING_COM")).toBe(232.25);
    expect(commissionFor(369.53, 15, "BOOKING_COM")).toBe(55.19);
    expect(commissionFor(210.03, 15, "BOOKING_COM")).toBe(31.37);
    expect(commissionFor(233.28, 15, "BOOKING_COM")).toBe(34.84);
    expect(roomFromCommissionBase(209.1, "BOOKING_COM")).toBe(210.03);
    // Other platforms charge on the whole room price.
    expect(commissionBase(369.53, "AIRBNB")).toBe(369.53);
  });

  it("business income tax scale (estimate)", () => {
    expect(businessIncomeTax(2025, 15_000)).toBe(2_000); // 9% + 22%
    expect(businessIncomeTax(2026, 15_000)).toBe(1_900); // 9% + 20%
    expect(businessIncomeTax(2026, 0)).toBe(0);
  });
});

describe("per-stay tax and net", () => {
  let ctx: OrgContext;
  let propertyId: string;
  let guestId: string;

  beforeAll(async () => {
    await resetDatabase();
    ctx = await createTenant("Pricing");
    propertyId = (await db.property.create({
      data: { organizationId: ctx.organizationId, name: "Διαμέρισμα 1 Υπνοδωματίου", city: "Χανιά", country: "Ελλάδα", basePrice: 60, ama: "00001111111", kind: "APARTMENT", areaSqm: 45 },
    })).id;
    guestId = (await createGuest(ctx)).id;
    await updateTaxSettings(ctx, { taxRegime: "BUSINESS", businessTaxRate: 20 });
  });

  it("takes Booking's total with ΤΑΚΚ, removes the ΤΑΚΚ and adds the 15% commission", async () => {
    const r = await createReservation(ctx, {
      propertyId, guestId, guestsCount: 2, checkIn: "2026-10-11", checkOut: "2026-10-18",
      totalAmount: 425.53, amountIncludesClimateFee: true, source: "BOOKING_COM",
    });
    expect(r.totalAmount).toBe(369.53); // 425,53 − 7 × 8 € ΤΑΚΚ
    expect(r.commission).toBe(55.19);

    const tx = await db.transaction.findMany({ where: { reservationId: r.id } });
    expect(tx.map((t) => [t.type, t.category, Number(t.amount)]).sort()).toEqual([
      ["EXPENSE", "PLATFORM_FEE", 55.19],
      ["INCOME", "BOOKING", 369.53],
    ]);

    const tax = await getStayTax(ctx, r.id, NOW);
    expect(tax).toMatchObject({ guestTotal: 425.53, climateFee: 56, rent: 325.39, presenceFee: 1.63, vat: 42.51, commission: 55.19, incomeTaxRate: 0.2 });
    expect(tax.incomeTax).toBe(54.04); // (325,39 − 55,19) × 20%
    expect(tax.net).toBe(216.16); // 369,53 − 42,51 − 1,63 − 55,19 − 54,04
  });

  it("keeps a manually entered commission and drops it for free stays", async () => {
    const r = await createReservation(ctx, {
      propertyId, guestId, guestsCount: 2, checkIn: "2026-11-02", checkOut: "2026-11-04",
      totalAmount: 120, source: "AIRBNB", commission: 4.2,
    });
    expect(r.commission).toBe(4.2);
    const free = await updateReservation(ctx, r.id, { complimentary: true, totalAmount: 0 });
    expect(free.commission).toBe(0);
    expect(await db.transaction.count({ where: { reservationId: r.id } })).toBe(0);
  });

  it("individuals: Ε2 tax on rent − 5% at the year's effective rate; commission not deductible", async () => {
    await updateTaxSettings(ctx, { taxRegime: "INDIVIDUAL" });
    const r = await createReservation(ctx, {
      propertyId, guestId, guestsCount: 2, checkIn: "2026-09-19", checkOut: "2026-09-23",
      totalAmount: 265.28, amountIncludesClimateFee: true, source: "BOOKING_COM",
    });
    expect(r.totalAmount).toBe(233.28);
    const tax = await getStayTax(ctx, r.id, NOW);
    const annual = await getAnnualReport(ctx, 2026, 0, NOW);
    expect(annual.effectiveTaxRate).toBe(0.15); // well inside the first bracket
    expect(tax.vat).toBe(0);
    expect(tax.incomeTax).toBe(33.24); // 233,28 × 95% × 15%
    expect(tax.net).toBe(Math.round((233.28 - tax.commission - 33.24) * 100) / 100);
  });
});
