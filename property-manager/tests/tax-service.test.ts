import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import type { OrgContext } from "@/lib/permissions";
import { cancelReservation, createReservation } from "@/lib/services/reservations";
import { getAnnualReport, getTaxOverview, markFiling, setStayDeclaration } from "@/lib/services/tax";
import { createGuest, createTenant, resetDatabase } from "./helpers";

const NOW = new Date("2026-08-05T09:00:00Z");

describe("tax service", () => {
  let ctx: OrgContext;
  let other: OrgContext;
  let julyStay: string;

  beforeAll(async () => {
    await resetDatabase();
    ctx = await createTenant("Tax");
    other = await createTenant("Other");
    const flat = await db.property.create({
      data: { organizationId: ctx.organizationId, name: "Flat", city: "Athens", country: "Greece", basePrice: 100, ama: "00001234567", kind: "APARTMENT", areaSqm: 60 },
    });
    const villa = await db.property.create({
      data: { organizationId: ctx.organizationId, name: "Villa", city: "Chania", country: "Greece", basePrice: 300, kind: "DETACHED_HOUSE", areaSqm: 150 },
    });
    const g = await createGuest(ctx);
    const base = { guestId: g.id, guestsCount: 2 };
    julyStay = (await createReservation(ctx, { ...base, propertyId: flat.id, checkIn: "2026-07-10", checkOut: "2026-07-15", totalAmount: 1000 })).id; // 5 × 8 = 40
    await createReservation(ctx, { ...base, propertyId: villa.id, checkIn: "2026-07-20", checkOut: "2026-07-22", totalAmount: 900 }); // 2 × 15 = 30
    await createReservation(ctx, { ...base, propertyId: flat.id, checkIn: "2026-08-10", checkOut: "2026-08-12", totalAmount: 300 }); // future
    const cancelledPaid = await createReservation(ctx, { ...base, propertyId: villa.id, checkIn: "2026-09-01", checkOut: "2026-09-05", totalAmount: 200 });
    await db.reservation.update({ where: { id: cancelledPaid.id }, data: { status: "CANCELLED", cancelledAt: new Date("2026-07-28T10:00:00Z") } });
    const cancelledFree = await createReservation(ctx, { ...base, propertyId: villa.id, checkIn: "2026-09-10", checkOut: "2026-09-12", totalAmount: 0 });
    await cancelReservation(ctx, cancelledFree.id);
  });

  it("lists stay declarations due, with the 20th-of-next-month deadline", async () => {
    const o = await getTaxOverview(ctx, NOW);
    const due = o.pendingDeclarations.map((s) => [s.propertyName, s.declaration.deadline]);
    expect(due).toEqual([
      ["Flat", "2026-08-20"],
      ["Villa", "2026-08-20"],
      ["Villa", "2026-08-20"], // paid cancellation, counted from the cancellation date
    ]);
    expect(o.totals.declarationsOverdue).toBe(0);
  });

  it("computes the monthly climate fee and tracks the filing", async () => {
    let july = (await getTaxOverview(ctx, NOW)).monthly.find((m) => m.period === "2026-07")!;
    expect(july).toMatchObject({ climateFee: 70, climateFeeDeadline: "2026-08-31", climateFeeFiled: null, closed: true });
    await markFiling(ctx, { kind: "CLIMATE_FEE", period: "2026-07", amount: 70 });
    july = (await getTaxOverview(ctx, NOW)).monthly.find((m) => m.period === "2026-07")!;
    expect(july.climateFeeFiled?.amount).toBe(70);
    // Another organization's filings are separate.
    expect((await getTaxOverview(other, NOW)).monthly.find((m) => m.period === "2026-07")?.climateFeeFiled).toBeNull();
  });

  it("drops a stay from the list once declared", async () => {
    await setStayDeclaration(ctx, julyStay, { status: "DECLARED" });
    const o = await getTaxOverview(ctx, NOW);
    expect(o.pendingDeclarations.some((s) => s.reservationId === julyStay)).toBe(false);
    await expect(setStayDeclaration(other, julyStay, { status: "PENDING" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("warns about properties without an AMA", async () => {
    const o = await getTaxOverview(ctx, NOW);
    expect(o.regime).toBe("INDIVIDUAL");
    expect(o.warnings.some((w) => w.title === "Villa has no AMA")).toBe(true);
  });

  it("estimates the annual Ε2 tax with the 5% flat deduction", async () => {
    const r = await getAnnualReport(ctx, 2026, 0, NOW);
    // 1000 + 900 + 300 (future stays count in the year) + 200 paid cancellation
    expect(r.individual.gross).toBe(2400);
    expect(r.individual.deduction).toBe(120);
    expect(r.individual.taxable).toBe(2280);
    expect(r.individual.estimatedTax).toBe(342);
  });
});
