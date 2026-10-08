import { beforeAll, describe, expect, it } from "vitest";
import { resolveMembership } from "@/lib/auth/membership";
import { AppError } from "@/lib/errors";
import { getGuestDetails } from "@/lib/services/guests";
import { getProperty, getPropertyDetails, listProperties, updateProperty, deleteProperty } from "@/lib/services/properties";
import { createReservation, getReservation, listReservations, updateReservation, cancelReservation } from "@/lib/services/reservations";
import type { OrgContext } from "@/lib/permissions";
import { createGuest, createProperty, createReservationRow, createTenant, resetDatabase } from "./helpers";

const notFound = expect.objectContaining({ code: "NOT_FOUND" });

describe("organization isolation", () => {
  let a: OrgContext;
  let b: OrgContext;
  let bPropertyId: string;
  let bGuestId: string;
  let bReservationId: string;
  let aPropertyId: string;

  beforeAll(async () => {
    await resetDatabase();
    a = await createTenant("A");
    b = await createTenant("B");
    aPropertyId = (await createProperty(a, { name: "A villa" })).id;
    const bProperty = await createProperty(b, { name: "B villa" });
    const bGuest = await createGuest(b);
    bPropertyId = bProperty.id;
    bGuestId = bGuest.id;
    bReservationId = (await createReservationRow(b, { propertyId: bProperty.id, guestId: bGuest.id, checkIn: "2026-05-01", checkOut: "2026-05-04" })).id;
  });

  it("user cannot read another organization's property", async () => {
    await expect(getProperty(a, bPropertyId)).rejects.toEqual(notFound);
    await expect(getPropertyDetails(a, bPropertyId)).rejects.toEqual(notFound);
  });

  it("user cannot modify or delete another organization's property", async () => {
    await expect(updateProperty(a, bPropertyId, { name: "hijacked" })).rejects.toEqual(notFound);
    await expect(deleteProperty(a, bPropertyId)).rejects.toEqual(notFound);
    expect((await getProperty(b, bPropertyId)).name).toBe("B villa");
  });

  it("lists only the caller's properties", async () => {
    const rows = await listProperties(a);
    expect(rows.map((p) => p.id)).toEqual([aPropertyId]);
  });

  it("user cannot access another organization's reservation", async () => {
    await expect(getReservation(a, bReservationId)).rejects.toEqual(notFound);
    await expect(updateReservation(a, bReservationId, { notes: "x" })).rejects.toEqual(notFound);
    await expect(cancelReservation(a, bReservationId)).rejects.toEqual(notFound);
    expect(await listReservations(a)).toHaveLength(0);
  });

  it("user cannot book another organization's property or guest", async () => {
    const aGuest = await createGuest(a);
    await expect(
      createReservation(a, { propertyId: bPropertyId, guestId: aGuest.id, checkIn: "2026-06-01", checkOut: "2026-06-03", guestsCount: 2, totalAmount: 100 }),
    ).rejects.toEqual(notFound);
    await expect(
      createReservation(a, { propertyId: aPropertyId, guestId: bGuestId, checkIn: "2026-06-01", checkOut: "2026-06-03", guestsCount: 2, totalAmount: 100 }),
    ).rejects.toEqual(notFound);
    await expect(getGuestDetails(a, bGuestId)).rejects.toBeInstanceOf(AppError);
  });

  it("the active-organization preference cannot select a foreign organization", async () => {
    const membership = await resolveMembership(a.userId, b.organizationId);
    expect(membership?.organizationId).toBe(a.organizationId);
  });
});
