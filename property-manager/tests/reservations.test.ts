import { beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import type { OrgContext } from "@/lib/permissions";
import { cancelReservation, createReservation, updateReservation } from "@/lib/services/reservations";
import { createGuest, createProperty, createTenant, resetDatabase } from "./helpers";

describe("reservations", () => {
  let ctx: OrgContext;
  let propertyId: string;
  let guestId: string;
  const base = () => ({ propertyId, guestId, guestsCount: 2, totalAmount: 450 });

  beforeAll(async () => {
    await resetDatabase();
    ctx = await createTenant("R");
    propertyId = (await createProperty(ctx)).id;
    guestId = (await createGuest(ctx)).id;
    await createReservation(ctx, { ...base(), checkIn: "2026-07-10", checkOut: "2026-07-15" });
  });

  it("rejects check-out on or before check-in", async () => {
    await expect(createReservation(ctx, { ...base(), checkIn: "2026-08-10", checkOut: "2026-08-10" })).rejects.toBeInstanceOf(ZodError);
    await expect(createReservation(ctx, { ...base(), checkIn: "2026-08-10", checkOut: "2026-08-09" })).rejects.toBeInstanceOf(ZodError);
  });

  it("cannot create an overlapping confirmed reservation", async () => {
    await expect(createReservation(ctx, { ...base(), checkIn: "2026-07-12", checkOut: "2026-07-18" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(createReservation(ctx, { ...base(), checkIn: "2026-07-08", checkOut: "2026-07-11" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(createReservation(ctx, { ...base(), checkIn: "2026-07-11", checkOut: "2026-07-12" })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("allows same-day turnover", async () => {
    const r = await createReservation(ctx, { ...base(), checkIn: "2026-07-15", checkOut: "2026-07-17" });
    expect(r.status).toBe("CONFIRMED");
  });

  it("allows an overlapping PENDING reservation but not confirming it", async () => {
    const pending = await createReservation(ctx, { ...base(), status: "PENDING", checkIn: "2026-07-13", checkOut: "2026-07-14" });
    await expect(updateReservation(ctx, pending.id, { status: "CONFIRMED" })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects moving a reservation onto another stay", async () => {
    const r = await createReservation(ctx, { ...base(), checkIn: "2026-09-01", checkOut: "2026-09-03" });
    await expect(updateReservation(ctx, r.id, { checkIn: "2026-07-14", checkOut: "2026-07-16" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(updateReservation(ctx, r.id, { checkOut: "2026-08-30" })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("frees the dates and removes booking income when cancelled", async () => {
    const r = await createReservation(ctx, { ...base(), checkIn: "2026-10-01", checkOut: "2026-10-05" });
    expect(await db.transaction.count({ where: { reservationId: r.id, category: "BOOKING" } })).toBe(1);
    await cancelReservation(ctx, r.id);
    expect(await db.transaction.count({ where: { reservationId: r.id, category: "BOOKING" } })).toBe(0);
    const again = await createReservation(ctx, { ...base(), checkIn: "2026-10-02", checkOut: "2026-10-04" });
    expect(again.status).toBe("CONFIRMED");
  });

  it("can create a new guest inline", async () => {
    const r = await createReservation(ctx, {
      ...base(),
      guestId: undefined,
      newGuest: { firstName: "Nia", lastName: "Inline", email: "nia@example.com" },
      checkIn: "2026-11-01",
      checkOut: "2026-11-03",
    });
    expect(r.guestName).toBe("Nia Inline");
  });

  it("does not let concurrent bookings double-book a property", async () => {
    const attempts = await Promise.allSettled(
      Array.from({ length: 4 }, () => createReservation(ctx, { ...base(), checkIn: "2026-12-01", checkOut: "2026-12-05" })),
    );
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
  });
});
