import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import type { OrgContext } from "@/lib/permissions";
import { createReservation } from "@/lib/services/reservations";
import { getStayTax, updateTaxSettings } from "@/lib/services/tax";
import { createGuest, createTenant, resetDatabase } from "./helpers";

const NOW = new Date("2026-10-09T09:00:00Z");

describe("Booking.com payment charge", () => {
  let ctx: OrgContext;
  let bookingId: string;
  let directId: string;

  beforeAll(async () => {
    await resetDatabase();
    ctx = await createTenant("Serene");
    const p = await db.property.create({
      data: { organizationId: ctx.organizationId, name: "Serene Vintage", city: "Athens", country: "Greece", basePrice: 40, ama: "00003478449", kind: "APARTMENT", areaSqm: 50 },
    });
    const g = await createGuest(ctx, "Tabita", "Ghimire");
    const base = { propertyId: p.id, guestId: g.id, guestsCount: 2, checkIn: "2026-10-03", checkOut: "2026-10-08" };
    // The stay of the screenshot: payout 214,66 € = 250,03 − 4,00 − 31,37 (Booking adds the 0,93 € 0.5% fee on top).
    bookingId = (await createReservation(ctx, { ...base, totalAmount: 209.1, source: "BOOKING_COM", commission: 31.37, confirmationCode: "6444699988" })).id;
    directId = (await createReservation(ctx, { ...base, checkIn: "2026-10-10", checkOut: "2026-10-12", totalAmount: 100, source: "DIRECT" })).id;
  });

  it("is taken from what the guest paid and lowers what is left for the owner", async () => {
    const t = await getStayTax(ctx, bookingId, NOW);
    expect(t.guestTotal).toBe(249.1);
    expect(t.paymentFeeRate).toBe(1.6);
    expect(t.paymentFee).toBe(3.99);
    // Payout check: guest total − commission − payment charge ≈ Booking's 214,66 € (they add the 0,93 € fee to the gross).
    expect(Math.round((t.guestTotal - t.commission - t.paymentFee) * 100) / 100).toBe(213.74);
    expect(t.net).toBe(Math.round((209.1 - 31.37 - 3.99 - t.incomeTax!) * 100) / 100);
  });

  it("does not apply to direct bookings and can be set to 0 when Booking does not take the payment", async () => {
    expect((await getStayTax(ctx, directId, NOW)).paymentFee).toBe(0);
    await updateTaxSettings(ctx, { paymentFeeRates: { BOOKING_COM: 0 } });
    expect((await getStayTax(ctx, bookingId, NOW)).paymentFee).toBe(0);
    await updateTaxSettings(ctx, { paymentFeeRates: { BOOKING_COM: 1.4 } });
    expect((await getStayTax(ctx, bookingId, NOW)).paymentFee).toBe(3.49);
  });
});
