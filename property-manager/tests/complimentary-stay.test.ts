import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import type { OrgContext } from "@/lib/permissions";
import { createReservation, updateReservation } from "@/lib/services/reservations";
import { getStayTax, getTaxOverview } from "@/lib/services/tax";
import { createGuest, createTenant, resetDatabase } from "./helpers";

const NOW = new Date("2026-08-05T09:00:00Z");

describe("free stay (δωρεάν φιλοξενία)", () => {
  let ctx: OrgContext;
  let propertyId: string;
  let guestId: string;

  beforeAll(async () => {
    await resetDatabase();
    ctx = await createTenant("Free");
    const flat = await db.property.create({
      data: { organizationId: ctx.organizationId, name: "Flat", city: "Athens", country: "Greece", basePrice: 100, ama: "00001234567", kind: "APARTMENT", areaSqm: 60 },
    });
    propertyId = flat.id;
    guestId = (await createGuest(ctx)).id;
  });

  it("has no income, ΤΑΚΚ or stay declaration", async () => {
    const r = await createReservation(ctx, { propertyId, guestId, guestsCount: 2, checkIn: "2026-07-10", checkOut: "2026-07-15", totalAmount: 0, complimentary: true });
    expect(r.complimentary).toBe(true);
    expect(await db.transaction.count({ where: { reservationId: r.id } })).toBe(0);

    const tax = await getStayTax(ctx, r.id, NOW);
    expect(tax).toMatchObject({ complimentary: true, climateFee: 0, climateFeeMonths: [], vat: 0, presenceFee: 0 });
    expect(tax.declaration.required).toBe(false);

    const o = await getTaxOverview(ctx, NOW);
    expect(o.pendingDeclarations).toHaveLength(0);
    expect(o.monthly.find((m) => m.period === "2026-07")).toMatchObject({ climateFee: 0, stays: 0 });
  });

  it("refuses rent on a free stay", async () => {
    await expect(
      createReservation(ctx, { propertyId, guestId, guestsCount: 2, checkIn: "2026-07-20", checkOut: "2026-07-22", totalAmount: 200, complimentary: true }),
    ).rejects.toMatchObject({ name: "ZodError" });

    const paid = await createReservation(ctx, { propertyId, guestId, guestsCount: 2, checkIn: "2026-07-20", checkOut: "2026-07-22", totalAmount: 200 });
    await expect(updateReservation(ctx, paid.id, { complimentary: true })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("switching a stay to free and back restores the obligations", async () => {
    const r = await createReservation(ctx, { propertyId, guestId, guestsCount: 2, checkIn: "2026-07-25", checkOut: "2026-07-27", totalAmount: 180 });
    expect((await getStayTax(ctx, r.id, NOW)).climateFee).toBe(16);

    await updateReservation(ctx, r.id, { complimentary: true, totalAmount: 0 });
    const free = await getStayTax(ctx, r.id, NOW);
    expect(free).toMatchObject({ climateFee: 0, declaration: { required: false, status: "NOT_REQUIRED" } });
    expect(await db.transaction.count({ where: { reservationId: r.id } })).toBe(0);

    await updateReservation(ctx, r.id, { complimentary: false, totalAmount: 180 });
    const tax = await getStayTax(ctx, r.id, NOW);
    expect(tax).toMatchObject({ climateFee: 16, totalAmount: 180 });
    expect(tax.declaration).toMatchObject({ required: true, status: "PENDING" });
    expect(await db.transaction.count({ where: { reservationId: r.id, type: "INCOME" } })).toBe(1);
  });

  it("a partial update keeps the other fields", async () => {
    const r = await createReservation(ctx, { propertyId, guestId, guestsCount: 2, checkIn: "2026-08-20", checkOut: "2026-08-22", totalAmount: 300, source: "DIRECT", status: "PENDING", currency: "USD" });
    const updated = await updateReservation(ctx, r.id, { notes: "Late arrival" });
    expect(updated).toMatchObject({ source: "DIRECT", status: "PENDING", currency: "USD", notes: "Late arrival" });
  });
});
