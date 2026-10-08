import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { notFound } from "@/lib/errors";
import type { OrgContext } from "@/lib/permissions";

export type Tx = PrismaClient | Prisma.TransactionClient;

/**
 * Ownership checks for ids that arrive from clients (or from the model).
 * An id from another organization is reported exactly like a missing one.
 */
export async function assertProperty(ctx: OrgContext, propertyId: string, client: Tx = db) {
  const p = await client.property.findFirst({ where: { id: propertyId, organizationId: ctx.organizationId } });
  if (!p) throw notFound("Property");
  return p;
}

export async function assertGuest(ctx: OrgContext, guestId: string, client: Tx = db) {
  const g = await client.guest.findFirst({ where: { id: guestId, organizationId: ctx.organizationId } });
  if (!g) throw notFound("Guest");
  return g;
}

export async function assertReservation(ctx: OrgContext, reservationId: string, client: Tx = db) {
  const r = await client.reservation.findFirst({ where: { id: reservationId, organizationId: ctx.organizationId } });
  if (!r) throw notFound("Reservation");
  return r;
}

export async function assertMember(ctx: OrgContext, userId: string, client: Tx = db) {
  const m = await client.organizationMember.findFirst({ where: { userId, organizationId: ctx.organizationId } });
  if (!m) throw notFound("Team member");
  return m;
}
