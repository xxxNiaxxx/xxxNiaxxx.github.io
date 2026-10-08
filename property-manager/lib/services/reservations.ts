import { Prisma, type ReservationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { dateToISO, isoToDate } from "@/lib/dates";
import { AppError, badRequest, conflict } from "@/lib/errors";
import type { OrgContext } from "@/lib/permissions";
import {
  reservationCreateSchema,
  reservationListQuery,
  reservationUpdateSchema,
  type ReservationListQuery,
} from "@/lib/validation/reservation";
import { syncBookingIncome } from "./financials";
import { assertGuest, assertProperty, assertReservation, type Tx } from "./scope";
import { serializeMessage, serializeReservation, serializeTask } from "./serializers";

const include = {
  property: { select: { id: true, name: true } },
  guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
} as const;

/** Statuses that block a property's calendar. */
const BLOCKING: ReservationStatus[] = ["CONFIRMED"];

/**
 * Throws CONFLICT if a confirmed reservation already occupies any night of
 * [checkIn, checkOut). Same-day turnover (checkOut == next checkIn) is fine.
 */
export async function assertNoOverlap(
  client: Tx,
  ctx: OrgContext,
  args: { propertyId: string; checkIn: string; checkOut: string; excludeId?: string },
) {
  const clash = await client.reservation.findFirst({
    where: {
      organizationId: ctx.organizationId,
      propertyId: args.propertyId,
      status: { in: BLOCKING },
      checkIn: { lt: isoToDate(args.checkOut) },
      checkOut: { gt: isoToDate(args.checkIn) },
      ...(args.excludeId ? { id: { not: args.excludeId } } : {}),
    },
    include: { guest: { select: { firstName: true, lastName: true } } },
  });
  if (clash) {
    throw conflict(
      `These dates overlap a confirmed stay (${clash.guest.firstName} ${clash.guest.lastName}, ` +
        `${dateToISO(clash.checkIn)} → ${dateToISO(clash.checkOut)}).`,
      { reservationId: clash.id },
    );
  }
}

/** Runs fn serializably so two concurrent bookings cannot both pass the overlap check. */
async function serializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (e) {
      const retryable = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034";
      if (!retryable) throw e;
      if (attempt >= 2) throw conflict("Another change to this property's calendar happened at the same time. Try again.");
    }
  }
}

export async function listReservations(ctx: OrgContext, query: ReservationListQuery = {}) {
  const f = reservationListQuery.parse(query);
  const rows = await db.reservation.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(f.status ? { status: f.status } : {}),
      ...(f.propertyId ? { propertyId: f.propertyId } : {}),
      ...(f.guestId ? { guestId: f.guestId } : {}),
      ...(f.to ? { checkIn: { lt: isoToDate(f.to) } } : {}),
      ...(f.from ? { checkOut: { gt: isoToDate(f.from) } } : {}),
      ...(f.q
        ? {
            OR: [
              { confirmationCode: { contains: f.q, mode: "insensitive" } },
              { notes: { contains: f.q, mode: "insensitive" } },
              { property: { name: { contains: f.q, mode: "insensitive" } } },
              { guest: { firstName: { contains: f.q, mode: "insensitive" } } },
              { guest: { lastName: { contains: f.q, mode: "insensitive" } } },
              { guest: { email: { contains: f.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include,
    orderBy: [{ checkIn: "desc" }],
    take: 500,
  });
  return rows.map(serializeReservation);
}

export async function getReservation(ctx: OrgContext, id: string) {
  await assertReservation(ctx, id);
  const row = await db.reservation.findUniqueOrThrow({ where: { id }, include });
  return serializeReservation(row);
}

export async function getReservationDetails(ctx: OrgContext, id: string) {
  const reservation = await getReservation(ctx, id);
  const [tasks, messages] = await Promise.all([
    db.task.findMany({
      where: { organizationId: ctx.organizationId, reservationId: id },
      include: { property: { select: { id: true, name: true } }, assignedTo: true },
      orderBy: { dueAt: "asc" },
    }),
    db.message.findMany({
      where: { organizationId: ctx.organizationId, reservationId: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { reservation, tasks: tasks.map((t) => serializeTask(t)), messages: messages.map(serializeMessage) };
}

export async function createReservation(ctx: OrgContext, input: unknown) {
  const data = reservationCreateSchema.parse(input);
  const row = await serializable(async (tx) => {
    const property = await assertProperty(ctx, data.propertyId, tx);
    if (property.status !== "ACTIVE") throw badRequest("This property is inactive. Activate it before taking bookings.");
    if (data.guestsCount > property.maxGuests) {
      throw badRequest(`${property.name} sleeps at most ${property.maxGuests} guests.`);
    }
    let guestId = data.guestId;
    if (guestId) await assertGuest(ctx, guestId, tx);
    else if (data.newGuest) {
      const guest = await tx.guest.create({ data: { ...data.newGuest, organizationId: ctx.organizationId } });
      guestId = guest.id;
    }
    if (!guestId) throw badRequest("A guest is required");
    if (BLOCKING.includes(data.status)) await assertNoOverlap(tx, ctx, data);

    const created = await tx.reservation.create({
      data: {
        organizationId: ctx.organizationId,
        propertyId: data.propertyId,
        guestId,
        source: data.source,
        confirmationCode: data.confirmationCode,
        checkIn: isoToDate(data.checkIn),
        checkOut: isoToDate(data.checkOut),
        guestsCount: data.guestsCount,
        totalAmount: data.totalAmount,
        currency: data.currency,
        status: data.status,
        notes: data.notes,
      },
      include,
    });
    await syncBookingIncome(tx, created);
    return created;
  });
  return serializeReservation(row);
}

export async function updateReservation(ctx: OrgContext, id: string, input: unknown) {
  const data = reservationUpdateSchema.parse(input);
  const row = await serializable(async (tx) => {
    const current = await assertReservation(ctx, id, tx);
    const next = {
      propertyId: data.propertyId ?? current.propertyId,
      checkIn: data.checkIn ?? dateToISO(current.checkIn),
      checkOut: data.checkOut ?? dateToISO(current.checkOut),
      status: data.status ?? current.status,
      guestsCount: data.guestsCount ?? current.guestsCount,
    };
    if (next.checkOut <= next.checkIn) {
      throw new AppError("VALIDATION", "Check-out must be after check-in", [
        { path: "checkOut", message: "Check-out must be after check-in" },
      ]);
    }
    const property = await assertProperty(ctx, next.propertyId, tx);
    if (data.guestsCount !== undefined || data.propertyId) {
      if (next.guestsCount > property.maxGuests) throw badRequest(`${property.name} sleeps at most ${property.maxGuests} guests.`);
    }
    if (data.guestId) await assertGuest(ctx, data.guestId, tx);
    if (BLOCKING.includes(next.status)) await assertNoOverlap(tx, ctx, { ...next, excludeId: id });

    const statusChange =
      data.status && data.status !== current.status
        ? { cancelledAt: data.status === "CANCELLED" ? new Date() : null }
        : {};
    const updated = await tx.reservation.update({
      where: { id },
      data: {
        ...data,
        ...statusChange,
        checkIn: data.checkIn ? isoToDate(data.checkIn) : undefined,
        checkOut: data.checkOut ? isoToDate(data.checkOut) : undefined,
      },
      include,
    });
    await syncBookingIncome(tx, updated);
    return updated;
  });
  return serializeReservation(row);
}

export async function cancelReservation(ctx: OrgContext, id: string) {
  const row = await db.$transaction(async (tx) => {
    const current = await assertReservation(ctx, id, tx);
    const updated = await tx.reservation.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: current.cancelledAt ?? new Date(),
        // Cancellations without any payment need no AADE stay declaration.
        ...(Number(current.totalAmount) === 0 && current.declarationStatus === "PENDING" ? { declarationStatus: "NOT_REQUIRED" as const } : {}),
      },
      include,
    });
    await syncBookingIncome(tx, updated);
    // Open tasks tied to a cancelled stay no longer make sense.
    await tx.task.updateMany({
      where: { organizationId: ctx.organizationId, reservationId: id, status: { in: ["TODO", "IN_PROGRESS"] } },
      data: { status: "CANCELLED" },
    });
    return updated;
  });
  return serializeReservation(row);
}
