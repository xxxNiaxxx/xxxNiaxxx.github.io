import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import type { OrgContext } from "@/lib/permissions";
import { priceSuggestions } from "@/lib/services/price-suggestions";
import { createReservation } from "@/lib/services/reservations";
import { createGuest, createTenant, resetDatabase } from "./helpers";

const NOW = new Date("2026-07-01T08:00:00Z");

describe("price suggestions", () => {
  let ctx: OrgContext;
  let busy: string;
  let quiet: string;

  beforeAll(async () => {
    await resetDatabase();
    ctx = await createTenant("Prices");
    const guest = await createGuest(ctx);
    busy = (await db.property.create({ data: { organizationId: ctx.organizationId, name: "Busy", city: "X", country: "GR", basePrice: 100, maxGuests: 4 } })).id;
    quiet = (await db.property.create({ data: { organizationId: ctx.organizationId, name: "Quiet", city: "X", country: "GR", basePrice: 100, maxGuests: 4 } })).id;
    const stay = (propertyId: string, checkIn: string, checkOut: string, totalAmount: number) =>
      createReservation(ctx, { propertyId, guestId: guest.id, guestsCount: 2, checkIn, checkOut, totalAmount, status: checkOut <= "2026-07-01" ? "COMPLETED" : "CONFIRMED" });
    // Busy: July booked except a 1-night gap on 10/07 and 2 nights at the start.
    await stay(busy, "2026-07-03", "2026-07-10", 700);
    await stay(busy, "2026-07-11", "2026-08-02", 2200);
    // Busy earned 130/night in June.
    await stay(busy, "2026-06-10", "2026-06-20", 1300);
    // Quiet: one stay in 3 weeks.
    await stay(quiet, "2026-07-20", "2026-07-22", 200);
  });

  it("finds gaps, last-minute nights and demand", async () => {
    const s = await priceSuggestions(ctx, {}, NOW);
    const busyOnes = s.filter((x) => x.propertyId === busy);
    expect(busyOnes.find((x) => x.kind === "GAP")).toMatchObject({ from: "2026-07-10", to: "2026-07-11", price: 80 });
    expect(busyOnes.find((x) => x.kind === "LAST_MINUTE")).toMatchObject({ title: "2 ελεύθερες νύχτες την επόμενη εβδομάδα", price: 85 });
    expect(busyOnes.find((x) => x.kind === "HIGH_DEMAND")).toMatchObject({ price: 110 });
    expect(busyOnes.find((x) => x.kind === "ACHIEVED_RATE")).toMatchObject({ price: 130 });
    const quietOnes = s.filter((x) => x.propertyId === quiet);
    expect(quietOnes.map((x) => x.kind)).toEqual(expect.arrayContaining(["LAST_MINUTE", "LOW_DEMAND"]));
    expect(await priceSuggestions(ctx, { propertyId: quiet }, NOW)).toHaveLength(quietOnes.length);
  });
});
