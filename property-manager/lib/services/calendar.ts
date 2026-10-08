import { z } from "zod";
import { db } from "@/lib/db";
import { isoToDate, zonedDateTime, zonedISODate } from "@/lib/dates";
import type { OrgContext } from "@/lib/permissions";
import { id, isoDate, optionalQuery } from "@/lib/validation/common";
import { serializeReservation } from "./serializers";

export const calendarQuery = z
  .object({ from: isoDate, to: isoDate, propertyId: optionalQuery(id) })
  .refine((v) => v.to > v.from, { message: "Η λήξη πρέπει να είναι μετά την έναρξη", path: ["to"] });

/** Reservations overlapping [from, to) and task counts per property/day. */
export async function getCalendar(ctx: OrgContext, query: unknown) {
  const q = calendarQuery.parse(query);
  const [properties, reservations, tasks] = await Promise.all([
    db.property.findMany({
      where: { organizationId: ctx.organizationId, ...(q.propertyId ? { id: q.propertyId } : {}) },
      select: { id: true, name: true, status: true },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    db.reservation.findMany({
      where: {
        organizationId: ctx.organizationId,
        status: { not: "CANCELLED" },
        checkIn: { lt: isoToDate(q.to) },
        checkOut: { gt: isoToDate(q.from) },
        ...(q.propertyId ? { propertyId: q.propertyId } : {}),
      },
      include: {
        property: { select: { id: true, name: true } },
        guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      },
      orderBy: { checkIn: "asc" },
    }),
    db.task.findMany({
      where: {
        organizationId: ctx.organizationId,
        status: { not: "CANCELLED" },
        dueAt: { gte: zonedDateTime(q.from), lt: zonedDateTime(q.to) },
        ...(q.propertyId ? { propertyId: q.propertyId } : {}),
      },
      select: { id: true, propertyId: true, type: true, status: true, title: true, dueAt: true },
    }),
  ]);
  return {
    from: q.from,
    to: q.to,
    properties,
    reservations: reservations.map(serializeReservation),
    tasks: tasks.map((t) => ({
      id: t.id,
      propertyId: t.propertyId,
      type: t.type,
      status: t.status,
      title: t.title,
      date: t.dueAt ? zonedISODate(t.dueAt) : null,
    })),
  };
}
export type CalendarData = Awaited<ReturnType<typeof getCalendar>>;
