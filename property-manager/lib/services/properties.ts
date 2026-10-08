import { db } from "@/lib/db";
import { addDaysISO, isoToDate, monthRange, todayISO } from "@/lib/dates";
import { conflict, AppError } from "@/lib/errors";
import { hasRole, type OrgContext } from "@/lib/permissions";
import {
  propertyCreateSchema,
  propertyListQuery,
  propertyUpdateSchema,
  type PropertyListQuery,
} from "@/lib/validation/property";
import { getRevenueSummary } from "./financials";
import { assertProperty } from "./scope";
import { serializeProperty, serializeReservation, serializeTask } from "./serializers";

export async function listProperties(ctx: OrgContext, query: PropertyListQuery = {}) {
  const { q, status } = propertyListQuery.parse(query);
  const rows = await db.property.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
  return rows.map(serializeProperty);
}

export async function getProperty(ctx: OrgContext, id: string) {
  return serializeProperty(await assertProperty(ctx, id));
}

/** Property page: current/upcoming stays, open tasks, this month's numbers. */
export async function getPropertyDetails(ctx: OrgContext, id: string, now: Date = new Date()) {
  const property = await assertProperty(ctx, id);
  const today = isoToDate(todayISO(now));
  const [current, upcoming, tasks, revenue] = await Promise.all([
    db.reservation.findFirst({
      where: {
        organizationId: ctx.organizationId,
        propertyId: id,
        status: { in: ["CONFIRMED", "COMPLETED"] },
        checkIn: { lte: today },
        checkOut: { gt: today },
      },
      include: { guest: true, property: { select: { id: true, name: true } } },
    }),
    db.reservation.findMany({
      where: {
        organizationId: ctx.organizationId,
        propertyId: id,
        status: { in: ["CONFIRMED", "PENDING"] },
        checkIn: { gt: today },
      },
      include: { guest: true, property: { select: { id: true, name: true } } },
      orderBy: { checkIn: "asc" },
      take: 10,
    }),
    db.task.findMany({
      where: { organizationId: ctx.organizationId, propertyId: id, status: { in: ["TODO", "IN_PROGRESS"] } },
      include: { property: { select: { id: true, name: true } }, assignedTo: true },
      orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }],
      take: 20,
    }),
    getRevenueSummary(ctx, { ...monthRange(todayISO(now)), propertyId: id }, now),
  ]);
  return {
    property: serializeProperty(property),
    currentReservation: current ? serializeReservation(current) : null,
    upcomingReservations: upcoming.map(serializeReservation),
    openTasks: tasks.map((t) => serializeTask(t, now)),
    month: {
      from: revenue.from,
      to: revenue.to,
      income: revenue.income,
      expenses: revenue.expenses,
      net: revenue.net,
      occupancy: revenue.occupancy,
      bookedNights: revenue.bookedNights,
    },
    next30Days: { from: todayISO(now), to: addDaysISO(todayISO(now), 30) },
  };
}

export async function createProperty(ctx: OrgContext, input: unknown) {
  const data = propertyCreateSchema.parse(input);
  const row = await db.property.create({ data: { ...data, organizationId: ctx.organizationId } });
  return serializeProperty(row);
}

export async function updateProperty(ctx: OrgContext, id: string, input: unknown) {
  const { compliance, ...data } = propertyUpdateSchema.parse(input);
  const current = await assertProperty(ctx, id);
  const row = await db.property.update({
    where: { id },
    // Checklist updates are partial: merge with what is stored.
    data: { ...data, ...(compliance ? { compliance: { ...((current.compliance as object) ?? {}), ...compliance } } : {}) },
  });
  return serializeProperty(row);
}

/** Hard delete is only allowed for admins and for properties with no stays. */
export async function deleteProperty(ctx: OrgContext, id: string) {
  if (!hasRole(ctx, "ADMIN")) throw new AppError("FORBIDDEN", "Only admins can delete properties");
  await assertProperty(ctx, id);
  const reservations = await db.reservation.count({ where: { propertyId: id, organizationId: ctx.organizationId } });
  if (reservations > 0) {
    throw conflict("This property has reservations. Deactivate it instead of deleting it.");
  }
  await db.property.delete({ where: { id } });
}
