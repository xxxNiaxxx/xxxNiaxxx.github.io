import { db } from "@/lib/db";
import { conflict } from "@/lib/errors";
import type { OrgContext } from "@/lib/permissions";
import { guestCreateSchema, guestListQuery, guestUpdateSchema } from "@/lib/validation/guest";
import { assertGuest } from "./scope";
import { serializeGuest, serializeMessage, serializeReservation, toNumber } from "./serializers";

export async function listGuests(ctx: OrgContext, query: { q?: string } = {}) {
  const { q } = guestListQuery.parse(query);
  const terms = q?.split(/\s+/).filter(Boolean) ?? [];
  const rows = await db.guest.findMany({
    where: {
      organizationId: ctx.organizationId,
      AND: terms.map((term) => ({
        OR: [
          { firstName: { contains: term, mode: "insensitive" as const } },
          { lastName: { contains: term, mode: "insensitive" as const } },
          { email: { contains: term, mode: "insensitive" as const } },
          { phone: { contains: term } },
          { country: { contains: term, mode: "insensitive" as const } },
        ],
      })),
    },
    include: {
      reservations: {
        where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
        select: { totalAmount: true, checkIn: true },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 200,
  });
  return rows.map((g) => ({
    ...serializeGuest(g),
    stays: g.reservations.length,
    totalRevenue: g.reservations.reduce((sum, r) => sum + toNumber(r.totalAmount), 0),
    lastStay: g.reservations.map((r) => r.checkIn.toISOString().slice(0, 10)).sort().at(-1) ?? null,
  }));
}
export type GuestListItem = Awaited<ReturnType<typeof listGuests>>[number];

export async function getGuest(ctx: OrgContext, id: string) {
  return serializeGuest(await assertGuest(ctx, id));
}

export async function getGuestDetails(ctx: OrgContext, id: string) {
  const guest = await assertGuest(ctx, id);
  const [reservations, messages] = await Promise.all([
    db.reservation.findMany({
      where: { organizationId: ctx.organizationId, guestId: id },
      include: { property: { select: { id: true, name: true } }, guest: true },
      orderBy: { checkIn: "desc" },
    }),
    db.message.findMany({
      where: { organizationId: ctx.organizationId, guestId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  const stays = reservations.filter((r) => r.status === "CONFIRMED" || r.status === "COMPLETED").map(serializeReservation);
  const totalNights = stays.reduce((s, r) => s + r.nights, 0);
  return {
    guest: serializeGuest(guest),
    reservations: reservations.map(serializeReservation),
    messages: messages.map(serializeMessage),
    stats: {
      stays: stays.length,
      totalRevenue: stays.reduce((s, r) => s + r.totalAmount, 0),
      averageStay: stays.length ? Math.round((totalNights / stays.length) * 10) / 10 : 0,
      currency: stays[0]?.currency ?? "EUR",
    },
  };
}

export async function createGuest(ctx: OrgContext, input: unknown) {
  const data = guestCreateSchema.parse(input);
  const row = await db.guest.create({ data: { ...data, organizationId: ctx.organizationId } });
  return serializeGuest(row);
}

export async function updateGuest(ctx: OrgContext, id: string, input: unknown) {
  const data = guestUpdateSchema.parse(input);
  await assertGuest(ctx, id);
  return serializeGuest(await db.guest.update({ where: { id }, data }));
}

export async function deleteGuest(ctx: OrgContext, id: string) {
  await assertGuest(ctx, id);
  const count = await db.reservation.count({ where: { guestId: id, organizationId: ctx.organizationId } });
  if (count > 0) throw conflict("Ο επισκέπτης έχει κρατήσεις και δεν μπορεί να διαγραφεί.");
  await db.guest.delete({ where: { id } });
}
