import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { zonedDateTime } from "@/lib/dates";
import type { OrgContext } from "@/lib/permissions";
import { getDashboard } from "@/lib/services/dashboard";
import { getRevenueSummary } from "@/lib/services/financials";
import { createReservation } from "@/lib/services/reservations";
import { createGuest, createProperty, createTenant, resetDatabase } from "./helpers";

// 2026-06-15 10:00 in Athens
const NOW = new Date("2026-06-15T07:00:00Z");

describe("dashboard calculations", () => {
  let ctx: OrgContext;
  let other: OrgContext;

  beforeAll(async () => {
    await resetDatabase();
    ctx = await createTenant("Dash");
    other = await createTenant("Other");
    const p1 = await createProperty(ctx, { name: "One" });
    const p2 = await createProperty(ctx, { name: "Two" });
    const inactive = await createProperty(ctx, { name: "Three" });
    await db.property.update({ where: { id: inactive.id }, data: { status: "INACTIVE" } });
    const g = await createGuest(ctx);

    // Checks out today (1 night in June before today counted: 13,14 → 2 nights).
    await createReservation(ctx, { propertyId: p1.id, guestId: g.id, checkIn: "2026-06-12", checkOut: "2026-06-15", guestsCount: 2, totalAmount: 300 });
    // Checks in today, 5 nights.
    await createReservation(ctx, { propertyId: p1.id, guestId: g.id, checkIn: "2026-06-15", checkOut: "2026-06-20", guestsCount: 2, totalAmount: 500 });
    // In house, spans month end: 3 nights in June (28,29,30).
    await createReservation(ctx, { propertyId: p2.id, guestId: g.id, checkIn: "2026-06-28", checkOut: "2026-07-03", guestsCount: 2, totalAmount: 1000 });
    // Cancelled — must not count anywhere.
    const cancelled = await createReservation(ctx, { propertyId: p2.id, guestId: g.id, checkIn: "2026-06-10", checkOut: "2026-06-12", guestsCount: 2, totalAmount: 999, status: "PENDING" });
    await db.reservation.update({ where: { id: cancelled.id }, data: { status: "CANCELLED" } });
    // Previous month income — not this month's revenue.
    await createReservation(ctx, { propertyId: p2.id, guestId: g.id, checkIn: "2026-05-20", checkOut: "2026-05-22", guestsCount: 2, totalAmount: 200 });
    await db.transaction.create({
      data: { organizationId: ctx.organizationId, propertyId: p1.id, type: "EXPENSE", category: "CLEANING", amount: 60, transactionDate: new Date("2026-06-15") },
    });
    // Overdue and today's tasks.
    await db.task.create({
      data: { organizationId: ctx.organizationId, propertyId: p2.id, title: "Overdue fix", type: "MAINTENANCE", dueAt: zonedDateTime("2026-06-13", "10:00") },
    });
    await db.task.create({
      data: { organizationId: ctx.organizationId, propertyId: p1.id, title: "Turnover", type: "CLEANING", dueAt: zonedDateTime("2026-06-15", "12:00") },
    });
    // Noise in another organization.
    const op = await createProperty(other);
    await createReservation(other, { propertyId: op.id, guestId: (await createGuest(other)).id, checkIn: "2026-06-15", checkOut: "2026-06-18", guestsCount: 1, totalAmount: 7777 });
  });

  it("computes summary cards", async () => {
    const d = await getDashboard(ctx, NOW);
    expect(d.today).toBe("2026-06-15");
    expect(d.summary).toMatchObject({
      properties: 3,
      activeProperties: 2,
      activeReservations: 1, // only the stay checking in today is in-house tonight
      checkInsToday: 1,
      checkOutsToday: 1,
      monthlyRevenue: 1800, // 300 + 500 + 1000, by check-in date
    });
    // June: 30 days × 2 active properties = 60 nights; booked 3 + 5 + 3 = 11.
    expect(d.summary.occupancy).toBeCloseTo(11 / 60, 5);
  });

  it("lists today's agenda and what needs attention", async () => {
    const d = await getDashboard(ctx, NOW);
    expect(d.todayAgenda.cleaning.map((t) => t.title)).toEqual(["Turnover"]);
    expect(d.overdueTasks.map((t) => t.title)).toEqual(["Overdue fix"]);
    const kinds = d.attention.map((x) => x.kind);
    expect(kinds).toContain("OVERDUE_TASK");
    expect(kinds).toContain("NO_CHECKIN_MESSAGE");
  });

  it("flags upcoming check-ins with no cleaning scheduled", async () => {
    const d = await getDashboard(ctx, new Date("2026-06-26T07:00:00Z"));
    expect(d.attention.some((x) => x.kind === "MISSING_CLEANING" && x.detail.includes("Two"))).toBe(true);
  });

  it("computes the revenue summary per property", async () => {
    const s = await getRevenueSummary(ctx, {}, NOW);
    expect(s).toMatchObject({ from: "2026-06-01", to: "2026-07-01", income: 1800, expenses: 60, net: 1740 });
    const one = s.byProperty.find((p) => p.name === "One");
    expect(one).toMatchObject({ income: 800, expenses: 60, net: 740, bookedNights: 8 });
  });
});
