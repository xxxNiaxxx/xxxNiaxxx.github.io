import { Prisma, type AIAction } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { dateToISO } from "@/lib/dates";
import { AppError, badRequest, notFound } from "@/lib/errors";
import { formatDay } from "@/lib/format";
import { guestLanguage, languageName } from "@/lib/i18n/guest-language";
import type { OrgContext } from "@/lib/permissions";
import { createMessage } from "@/lib/services/messages";
import { assertGuest, assertProperty, assertReservation } from "@/lib/services/scope";
import { createTask } from "@/lib/services/tasks";
import { taskCreateSchema } from "@/lib/validation/task";

/**
 * Actions the assistant may *propose*. Nothing here runs until a member calls
 * approveAction(); proposal and execution both re-check organization ownership.
 */
export const sendGuestMessagePayload = z.object({
  guestId: z.string().min(1),
  reservationId: z.string().min(1).nullish(),
  message: z.string().trim().min(1, "Το μήνυμα δεν μπορεί να είναι κενό").max(5000),
  guestName: z.string().optional(),
  context: z.string().optional(),
  language: z.string().optional(),
  languageName: z.string().optional(),
});

export const createTaskPayload = taskCreateSchema.extend({
  dueAt: z.string().datetime({ offset: true }).nullish(),
  propertyName: z.string().optional(),
});

export const actionPayloadSchemas = {
  SEND_GUEST_MESSAGE: sendGuestMessagePayload,
  CREATE_TASK: createTaskPayload,
} as const;
export type ActionType = keyof typeof actionPayloadSchemas;

export function serializeAction(a: AIAction) {
  return {
    id: a.id,
    conversationId: a.conversationId,
    type: a.type,
    status: a.status,
    payload: a.payload as Record<string, unknown>,
    result: (a.result ?? null) as Record<string, unknown> | null,
    createdAt: a.createdAt.toISOString(),
    reviewedAt: a.reviewedAt?.toISOString() ?? null,
    executedAt: a.executedAt?.toISOString() ?? null,
  };
}
export type AIActionDTO = ReturnType<typeof serializeAction>;

async function normalizeMessagePayload(ctx: OrgContext, raw: unknown) {
  const p = sendGuestMessagePayload.parse(raw);
  const guest = await assertGuest(ctx, p.guestId);
  let context = p.context;
  if (p.reservationId) {
    const r = await assertReservation(ctx, p.reservationId);
    if (r.guestId !== guest.id) throw badRequest("Η κράτηση αφορά άλλον επισκέπτη");
    const property = await assertProperty(ctx, r.propertyId);
    context = `${property.name} · ${formatDay(dateToISO(r.checkIn))} → ${formatDay(dateToISO(r.checkOut))}`;
  }
  const language = guestLanguage(guest);
  return { ...p, guestName: `${guest.firstName} ${guest.lastName}`, context, language, languageName: languageName(language) };
}

async function normalizeTaskPayload(ctx: OrgContext, raw: unknown) {
  const p = createTaskPayload.parse(raw);
  const property = await assertProperty(ctx, p.propertyId);
  if (p.reservationId) await assertReservation(ctx, p.reservationId);
  return { ...p, propertyName: property.name };
}

function normalizePayload(ctx: OrgContext, type: ActionType, raw: unknown) {
  if (type === "SEND_GUEST_MESSAGE") return normalizeMessagePayload(ctx, raw);
  if (type === "CREATE_TASK") return normalizeTaskPayload(ctx, raw);
  throw badRequest(`Άγνωστος τύπος ενέργειας ${type as string}`);
}

export async function proposeAction(
  ctx: OrgContext,
  args: { type: ActionType; payload: unknown; conversationId?: string | null },
) {
  if (args.conversationId) {
    const conv = await db.aIConversation.findFirst({
      where: { id: args.conversationId, organizationId: ctx.organizationId },
    });
    if (!conv) throw notFound("Conversation");
  }
  const payload = await normalizePayload(ctx, args.type, args.payload);
  const row = await db.aIAction.create({
    data: {
      organizationId: ctx.organizationId,
      conversationId: args.conversationId ?? null,
      type: args.type,
      status: "PROPOSED",
      payload: payload as Prisma.InputJsonValue,
      createdByUserId: ctx.userId,
    },
  });
  return serializeAction(row);
}

async function findAction(ctx: OrgContext, id: string) {
  const row = await db.aIAction.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!row) throw notFound("Action");
  return row;
}

export async function listActions(ctx: OrgContext, filter: { status?: AIAction["status"]; conversationId?: string } = {}) {
  const rows = await db.aIAction.findMany({
    where: { organizationId: ctx.organizationId, ...filter },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map(serializeAction);
}

/** "Edit" in the UI: change the payload of a still-proposed action. */
export async function updateActionPayload(ctx: OrgContext, id: string, patch: unknown) {
  const action = await findAction(ctx, id);
  if (action.status !== "PROPOSED") throw new AppError("CONFLICT", "Μόνο ενέργειες προς έγκριση μπορούν να επεξεργαστούν");
  const merged = { ...(action.payload as object), ...(z.record(z.string(), z.unknown()).parse(patch)) };
  const payload = await normalizePayload(ctx, action.type as ActionType, merged);
  const row = await db.aIAction.update({ where: { id }, data: { payload: payload as Prisma.InputJsonValue } });
  return serializeAction(row);
}

export async function rejectAction(ctx: OrgContext, id: string) {
  await findAction(ctx, id);
  const { count } = await db.aIAction.updateMany({
    where: { id, organizationId: ctx.organizationId, status: "PROPOSED" },
    data: { status: "REJECTED", reviewedByUserId: ctx.userId, reviewedAt: new Date() },
  });
  if (count === 0) throw new AppError("CONFLICT", "Η ενέργεια έχει ήδη εξεταστεί");
  return serializeAction(await findAction(ctx, id));
}

/**
 * Explicit approval by a member. The PROPOSED → APPROVED transition is atomic,
 * so a double click cannot execute an action twice.
 */
export async function approveAction(ctx: OrgContext, id: string) {
  const action = await findAction(ctx, id);
  const { count } = await db.aIAction.updateMany({
    where: { id, organizationId: ctx.organizationId, status: "PROPOSED" },
    data: { status: "APPROVED", reviewedByUserId: ctx.userId, reviewedAt: new Date() },
  });
  if (count === 0) throw new AppError("CONFLICT", "Η ενέργεια έχει ήδη εξεταστεί");

  try {
    const result = await execute(ctx, action.type as ActionType, action.payload);
    const row = await db.aIAction.update({
      where: { id },
      data: { status: "EXECUTED", executedAt: new Date(), result: result as Prisma.InputJsonValue },
    });
    return serializeAction(row);
  } catch (error) {
    const message = error instanceof AppError ? error.message : "Η ενέργεια δεν ολοκληρώθηκε";
    if (!(error instanceof AppError)) console.error(error);
    const row = await db.aIAction.update({
      where: { id },
      data: { status: "FAILED", result: { error: message } },
    });
    return serializeAction(row);
  }
}

async function execute(ctx: OrgContext, type: ActionType, rawPayload: unknown): Promise<Record<string, unknown>> {
  switch (type) {
    case "SEND_GUEST_MESSAGE": {
      const p = await normalizeMessagePayload(ctx, rawPayload);
      // Phase 1: no delivery channel — the message is recorded as SENT on INTERNAL.
      const message = await createMessage(ctx, {
        guestId: p.guestId,
        reservationId: p.reservationId ?? null,
        content: p.message,
        send: true,
      });
      return { messageId: message.id, status: message.status, channel: message.channel, simulated: true };
    }
    case "CREATE_TASK": {
      const { propertyName, ...task } = await normalizeTaskPayload(ctx, rawPayload);
      const created = await createTask(ctx, task);
      return { taskId: created.id, title: created.title, propertyName };
    }
    default:
      throw new AppError("BAD_REQUEST", `Άγνωστος τύπος ενέργειας ${type as string}`);
  }
}
