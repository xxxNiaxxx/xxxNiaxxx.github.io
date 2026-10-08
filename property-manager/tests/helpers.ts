import { db } from "@/lib/db";
import { isoToDate } from "@/lib/dates";
import type { OrgContext } from "@/lib/permissions";

let n = 0;
const uid = () => `${Date.now().toString(36)}${(n++).toString(36)}`;

export async function resetDatabase() {
  await db.$executeRawUnsafe(
    `TRUNCATE "AIAction","AIMessage","AIConversation","Transaction","Message","Task","Reservation","Guest","Property","OrganizationMember","Organization","User" CASCADE`,
  );
}

/** A user who owns a fresh organization. */
export async function createTenant(name = "Org", role: OrgContext["role"] = "OWNER"): Promise<OrgContext> {
  const user = await db.user.create({ data: { email: `${uid()}@test.local`, name: `${name} user`, passwordHash: "x" } });
  const org = await db.organization.create({ data: { name } });
  await db.organizationMember.create({ data: { organizationId: org.id, userId: user.id, role } });
  return { userId: user.id, organizationId: org.id, role };
}

export async function createProperty(ctx: OrgContext, overrides: Partial<{ name: string; maxGuests: number }> = {}) {
  return db.property.create({
    data: {
      organizationId: ctx.organizationId,
      name: overrides.name ?? `Property ${uid()}`,
      city: "Athens",
      country: "Greece",
      maxGuests: overrides.maxGuests ?? 4,
      basePrice: 100,
    },
  });
}

export async function createGuest(ctx: OrgContext, firstName = "Test", lastName = `Guest${uid()}`) {
  return db.guest.create({
    data: { organizationId: ctx.organizationId, firstName, lastName, email: `${uid()}@example.com` },
  });
}

export async function createReservationRow(
  ctx: OrgContext,
  args: { propertyId: string; guestId: string; checkIn: string; checkOut: string; status?: "CONFIRMED" | "PENDING" | "CANCELLED" | "COMPLETED"; totalAmount?: number },
) {
  return db.reservation.create({
    data: {
      organizationId: ctx.organizationId,
      propertyId: args.propertyId,
      guestId: args.guestId,
      checkIn: isoToDate(args.checkIn),
      checkOut: isoToDate(args.checkOut),
      totalAmount: args.totalAmount ?? 500,
      status: args.status ?? "CONFIRMED",
      confirmationCode: `T-${uid()}`,
    },
  });
}
