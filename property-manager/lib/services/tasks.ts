import type { Prisma, TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { todayISO, zonedDayRange } from "@/lib/dates";
import { AppError, badRequest, notFound } from "@/lib/errors";
import { hasRole, type OrgContext } from "@/lib/permissions";
import { taskCreateSchema, taskListQuery, taskUpdateSchema, type TaskListQuery } from "@/lib/validation/task";
import { assertMember, assertProperty, assertReservation } from "./scope";
import { serializeTask } from "./serializers";

const include = {
  property: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
} as const;

export const OPEN_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS"];

export const DEFAULT_CLEANING_CHECKLIST = [
  "Αλλαγή κλινοσκεπασμάτων",
  "Καθαρισμός μπάνιων",
  "Καθαρισμός κουζίνας και ψυγείου",
  "Σκούπισμα και σφουγγάρισμα",
  "Αναπλήρωση ειδών μπάνιου και καφέ",
  "Απομάκρυνση σκουπιδιών",
  "Έλεγχος για ζημιές και αναφορά",
].map((label) => ({ label, done: false }));

export async function listTasks(ctx: OrgContext, query: TaskListQuery = {}, now: Date = new Date()) {
  const f = taskListQuery.parse(query);
  const today = zonedDayRange(todayISO(now));
  const where: Prisma.TaskWhereInput = {
    organizationId: ctx.organizationId,
    ...(f.propertyId ? { propertyId: f.propertyId } : {}),
    ...(f.reservationId ? { reservationId: f.reservationId } : {}),
    ...(f.type ? { type: f.type } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(f.assignee === "me"
      ? { assignedToUserId: ctx.userId }
      : f.assignee === "unassigned"
        ? { assignedToUserId: null }
        : f.assignee
          ? { assignedToUserId: f.assignee }
          : {}),
  };
  let orderBy: Prisma.TaskOrderByWithRelationInput[] = [{ dueAt: { sort: "asc", nulls: "last" } }, { priority: "desc" }];
  switch (f.tab ?? "all") {
    case "today":
      Object.assign(where, { dueAt: { gte: today.start, lt: today.end } });
      if (!f.status) where.status = { in: OPEN_STATUSES };
      break;
    case "upcoming":
      Object.assign(where, { OR: [{ dueAt: { gte: today.end } }, { dueAt: null }] });
      if (!f.status) where.status = { in: OPEN_STATUSES };
      break;
    case "overdue":
      Object.assign(where, { dueAt: { lt: today.start }, status: { in: OPEN_STATUSES } });
      break;
    case "completed":
      where.status = "COMPLETED";
      orderBy = [{ completedAt: "desc" }];
      break;
  }
  const rows = await db.task.findMany({ where, include, orderBy, take: 300 });
  return rows.map((t) => serializeTask(t, now));
}

export async function getTask(ctx: OrgContext, id: string) {
  const row = await db.task.findFirst({ where: { id, organizationId: ctx.organizationId }, include });
  if (!row) throw notFound("Task");
  return serializeTask(row);
}

async function assertRelations(
  ctx: OrgContext,
  v: { propertyId: string; reservationId?: string | null; assignedToUserId?: string | null },
) {
  await assertProperty(ctx, v.propertyId);
  if (v.reservationId) {
    const r = await assertReservation(ctx, v.reservationId);
    if (r.propertyId !== v.propertyId) throw badRequest("Η κράτηση αφορά άλλο ακίνητο");
  }
  if (v.assignedToUserId) await assertMember(ctx, v.assignedToUserId);
}

function completionFields(status: TaskStatus | undefined, previous?: TaskStatus) {
  if (!status || status === previous) return {};
  return { completedAt: status === "COMPLETED" ? new Date() : null };
}

export async function createTask(ctx: OrgContext, input: unknown) {
  const data = taskCreateSchema.parse(input);
  await assertRelations(ctx, data);
  const checklist = data.checklist ?? (data.type === "CLEANING" ? DEFAULT_CLEANING_CHECKLIST : []);
  const row = await db.task.create({
    data: {
      ...data,
      checklist,
      organizationId: ctx.organizationId,
      ...completionFields(data.status),
    },
    include,
  });
  return serializeTask(row);
}

export async function updateTask(ctx: OrgContext, id: string, input: unknown) {
  const data = taskUpdateSchema.parse(input);
  const current = await db.task.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!current) throw notFound("Task");
  await assertRelations(ctx, {
    propertyId: data.propertyId ?? current.propertyId,
    reservationId: data.reservationId === undefined ? current.reservationId : data.reservationId,
    assignedToUserId: data.assignedToUserId,
  });
  const row = await db.task.update({
    where: { id },
    data: { ...data, ...completionFields(data.status, current.status) },
    include,
  });
  return serializeTask(row);
}

export async function deleteTask(ctx: OrgContext, id: string) {
  if (!hasRole(ctx, "ADMIN")) throw new AppError("FORBIDDEN", "Μόνο οι διαχειριστές μπορούν να διαγράψουν εργασίες. Ακυρώστε την.");
  const row = await db.task.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!row) throw notFound("Task");
  await db.task.delete({ where: { id } });
}
