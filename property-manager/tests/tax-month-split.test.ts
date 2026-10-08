import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import type { OrgContext } from "@/lib/permissions";
import { createReservation } from "@/lib/services/reservations";
import { getTaxOverview } from "@/lib/services/tax";
import { createGuest, createTenant, resetDatabase } from "./helpers";

describe("monthly ΤΑΚΚ return with a stay crossing months", () => {
  let ctx: OrgContext;

  beforeAll(async () => {
    await resetDatabase();
    ctx = await createTenant("Split");
    const flat = await db.property.create({
      data: { organizationId: ctx.organizationId, name: "Flat", city: "Athens", country: "Greece", basePrice: 100, ama: "00001111111", kind: "APARTMENT", areaSqm: 50 },
    });
    const g = await createGuest(ctx);
    // 29, 30, 31 July (3 × 8) + 1, 2 August (2 × 8)
    await createReservation(ctx, { propertyId: flat.id, guestId: g.id, checkIn: "2026-07-29", checkOut: "2026-08-03", guestsCount: 2, totalAmount: 600 });
  });

  const month = async (now: string, period: string) => (await getTaxOverview(ctx, new Date(now))).monthly.find((m) => m.period === period)!;

  it("puts each night in its own month", async () => {
    expect(await month("2026-09-05T09:00:00Z", "2026-07")).toMatchObject({ nights: 3, climateFee: 24, climateFeeDeadline: "2026-08-31" });
    expect(await month("2026-09-05T09:00:00Z", "2026-08")).toMatchObject({ nights: 2, climateFee: 16, climateFeeDeadline: "2026-09-30" });
  });

  it("counts July's nights in July's return even before the guest checks out", async () => {
    // On 1 August the guest is still in house; July is closed and owes its 3 nights.
    expect(await month("2026-08-01T09:00:00Z", "2026-07")).toMatchObject({ nights: 3, climateFee: 24, closed: true });
    // August so far: only the nights already spent (none on the morning of 1 August).
    expect((await month("2026-08-01T09:00:00Z", "2026-08")).climateFee).toBe(0);
    expect((await month("2026-08-02T09:00:00Z", "2026-08")).climateFee).toBe(8);
  });
});
