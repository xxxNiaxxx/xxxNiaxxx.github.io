import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { deleteAccount } from "@/lib/services/account-deletion";
import { createReservation } from "@/lib/services/reservations";
import { createGuest, createProperty, createTenant, resetDatabase } from "./helpers";

async function withPassword(userId: string, password = "secret123") {
  await db.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(password, 4) } });
}

describe("account deletion", () => {
  beforeEach(resetDatabase);

  it("requires the correct password", async () => {
    const ctx = await createTenant("Solo");
    await withPassword(ctx.userId);
    await expect(deleteAccount(ctx.userId, { password: "wrong" })).rejects.toMatchObject({ code: "VALIDATION" });
    expect(await db.user.count({ where: { id: ctx.userId } })).toBe(1);
  });

  it("deletes a sole-member organization with all of its data", async () => {
    const ctx = await createTenant("Solo");
    await withPassword(ctx.userId);
    const property = await createProperty(ctx);
    const guest = await createGuest(ctx);
    await createReservation(ctx, { propertyId: property.id, guestId: guest.id, checkIn: "2026-05-01", checkOut: "2026-05-03", guestsCount: 2, totalAmount: 200 });
    const other = await createTenant("Other");
    await createProperty(other);

    const res = await deleteAccount(ctx.userId, { password: "secret123" });
    expect(res.deletedOrganizations).toEqual([ctx.organizationId]);
    expect(await db.user.count({ where: { id: ctx.userId } })).toBe(0);
    for (const count of [
      db.organization.count({ where: { id: ctx.organizationId } }),
      db.property.count({ where: { organizationId: ctx.organizationId } }),
      db.guest.count({ where: { organizationId: ctx.organizationId } }),
      db.reservation.count({ where: { organizationId: ctx.organizationId } }),
      db.transaction.count({ where: { organizationId: ctx.organizationId } }),
    ]) expect(await count).toBe(0);
    // Other tenants are untouched.
    expect(await db.property.count({ where: { organizationId: other.organizationId } })).toBe(1);
  });

  it("keeps shared organizations and hands ownership to an admin", async () => {
    const owner = await createTenant("Shared");
    await withPassword(owner.userId);
    const member = await db.user.create({ data: { email: "m@test.local", passwordHash: "x" } });
    const admin = await db.user.create({ data: { email: "a@test.local", passwordHash: "x" } });
    await db.organizationMember.create({ data: { organizationId: owner.organizationId, userId: member.id, role: "MEMBER" } });
    await db.organizationMember.create({ data: { organizationId: owner.organizationId, userId: admin.id, role: "ADMIN" } });

    const res = await deleteAccount(owner.userId, { password: "secret123" });
    expect(res.deletedOrganizations).toEqual([]);
    expect(await db.organization.count({ where: { id: owner.organizationId } })).toBe(1);
    const promoted = await db.organizationMember.findFirstOrThrow({ where: { userId: admin.id } });
    expect(promoted.role).toBe("OWNER");
  });
});
