import type { AIMemory, AIMemoryKind, AIMemorySource } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { GUEST_LANGUAGE_CODES, type GuestLanguage } from "@/lib/i18n/guest-language";
import { formatGuestDate, type MessageKind } from "@/lib/i18n/guest-messages";
import type { OrgContext } from "@/lib/permissions";
import { assertProperty } from "@/lib/services/scope";

/**
 * What the assistant learns from managers: guest information per property,
 * team preferences, and message templates learned from edited drafts.
 * Everything is scoped to the organization and editable on /ai/knowledge.
 */
export const memoryInput = z.object({
  kind: z.enum(["GUEST_INFO", "PREFERENCE", "MESSAGE_TEMPLATE"]),
  content: z.string().trim().min(3, "Γράψτε τουλάχιστον 3 χαρακτήρες").max(4000),
  propertyId: z.preprocess((v) => (v === "" ? null : v), z.string().min(1).nullish()),
  language: z.preprocess((v) => (v === "" ? null : v), z.enum(GUEST_LANGUAGE_CODES).nullish()),
  messageKind: z.enum(["checkin", "thanks", "general"]).nullish(),
  active: z.boolean().optional(),
});

/** Greek script → "el"; otherwise unknown (null). Good enough to avoid mixing languages. */
export function detectLanguage(text: string): GuestLanguage | null {
  const greek = (text.match(/[Ͱ-Ͽἀ-῿]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  if (greek > latin) return "el";
  return null;
}

export function serializeMemory(m: AIMemory & { property?: { name: string } | null }) {
  return {
    id: m.id,
    kind: m.kind,
    content: m.content,
    propertyId: m.propertyId,
    propertyName: m.property?.name ?? null,
    language: m.language,
    messageKind: m.messageKind,
    source: m.source,
    active: m.active,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}
export type AIMemoryDTO = ReturnType<typeof serializeMemory>;

export async function listMemories(ctx: OrgContext, filter: { kind?: AIMemoryKind; propertyId?: string } = {}) {
  const rows = await db.aIMemory.findMany({
    where: { organizationId: ctx.organizationId, ...filter },
    include: { property: { select: { name: true } } },
    orderBy: [{ kind: "asc" }, { updatedAt: "desc" }],
    take: 500,
  });
  return rows.map(serializeMemory);
}

export async function createMemory(ctx: OrgContext, input: unknown, source: AIMemorySource = "MANUAL") {
  const data = memoryInput.parse(input);
  if (data.propertyId) await assertProperty(ctx, data.propertyId);
  const row = await db.aIMemory.create({
    data: {
      organizationId: ctx.organizationId,
      kind: data.kind,
      content: data.content,
      propertyId: data.propertyId ?? null,
      language: data.language ?? detectLanguage(data.content),
      messageKind: data.messageKind ?? null,
      source,
      active: data.active ?? true,
      createdByUserId: ctx.userId,
    },
    include: { property: { select: { name: true } } },
  });
  return serializeMemory(row);
}

async function findMemory(ctx: OrgContext, id: string) {
  const row = await db.aIMemory.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!row) throw notFound("Memory");
  return row;
}

export async function updateMemory(ctx: OrgContext, id: string, input: unknown) {
  await findMemory(ctx, id);
  const data = memoryInput.partial().parse(input);
  if (data.propertyId) await assertProperty(ctx, data.propertyId);
  const row = await db.aIMemory.update({
    where: { id },
    data: {
      ...data,
      ...(data.content && data.language === undefined ? { language: detectLanguage(data.content) } : {}),
    },
    include: { property: { select: { name: true } } },
  });
  return serializeMemory(row);
}

export async function deleteMemory(ctx: OrgContext, id: string) {
  await findMemory(ctx, id);
  await db.aIMemory.delete({ where: { id } });
}

// ─── Templates learned from edited drafts ────────────────────────────

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Turns a concrete approved message into a template with {name} {property} {checkIn} {checkOut}. */
export function toTemplate(
  message: string,
  vars: { firstName: string; property?: string | null; checkIn?: string | null; checkOut?: string | null; language: GuestLanguage },
) {
  let t = message;
  if (vars.checkIn) t = t.split(formatGuestDate(vars.checkIn, vars.language)).join("{checkIn}").split(vars.checkIn).join("{checkIn}");
  if (vars.checkOut) t = t.split(formatGuestDate(vars.checkOut, vars.language)).join("{checkOut}").split(vars.checkOut).join("{checkOut}");
  if (vars.property) t = t.split(vars.property).join("{property}");
  t = t.replace(new RegExp(`(^|[^\\p{L}])${escapeRegExp(vars.firstName)}(?=[^\\p{L}]|$)`, "gu"), "$1{name}");
  return t;
}

export function fillTemplate(template: string, vars: { name: string; property?: string; checkIn?: string; checkOut?: string; language: GuestLanguage }) {
  return template
    .split("{name}").join(vars.name)
    .split("{property}").join(vars.property ?? "")
    .split("{checkIn}").join(vars.checkIn ? formatGuestDate(vars.checkIn, vars.language) : "")
    .split("{checkOut}").join(vars.checkOut ? formatGuestDate(vars.checkOut, vars.language) : "");
}

/** Called when a manager approves a draft they edited: remember their version. */
export async function learnMessageTemplate(
  ctx: OrgContext,
  args: { message: string; messageKind: MessageKind; language: GuestLanguage; firstName: string; property?: string | null; checkIn?: string | null; checkOut?: string | null },
) {
  if (args.messageKind === "noStay") return null;
  const content = toTemplate(args.message, { ...args });
  // One active template per message kind and language: the latest edit wins.
  await db.aIMemory.updateMany({
    where: { organizationId: ctx.organizationId, kind: "MESSAGE_TEMPLATE", messageKind: args.messageKind, language: args.language, active: true },
    data: { active: false },
  });
  const row = await db.aIMemory.create({
    data: {
      organizationId: ctx.organizationId,
      kind: "MESSAGE_TEMPLATE",
      content,
      language: args.language,
      messageKind: args.messageKind,
      source: "EDIT",
      createdByUserId: ctx.userId,
    },
  });
  return serializeMemory(row);
}

export async function findTemplate(ctx: OrgContext, messageKind: MessageKind, language: GuestLanguage) {
  return db.aIMemory.findFirst({
    where: { organizationId: ctx.organizationId, kind: "MESSAGE_TEMPLATE", messageKind, language, active: true },
    orderBy: { createdAt: "desc" },
  });
}

/** Guest information for a property (and organization-wide), in a given language when known. */
export async function guestInfoFor(ctx: OrgContext, propertyId: string | null, language: GuestLanguage) {
  const rows = await db.aIMemory.findMany({
    where: {
      organizationId: ctx.organizationId,
      kind: "GUEST_INFO",
      active: true,
      OR: [{ propertyId }, { propertyId: null }],
    },
    orderBy: { createdAt: "asc" },
  });
  // Without an LLM we cannot translate: only reuse notes written in the guest's language
  // (notes in Latin script count as English).
  return rows.filter((r) => (r.language ?? "en") === language).map((r) => r.content);
}

/** Everything the LLM should know, as a compact text block for the system prompt. */
export async function memoriesForPrompt(ctx: OrgContext) {
  const rows = await db.aIMemory.findMany({
    where: { organizationId: ctx.organizationId, active: true },
    include: { property: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 80,
  });
  if (!rows.length) return "";
  const section = (kind: AIMemoryKind) =>
    rows
      .filter((r) => r.kind === kind)
      .map((r) =>
        kind === "MESSAGE_TEMPLATE"
          ? `- [${r.messageKind}, ${r.language}] ${r.content.replace(/\n+/g, " ⏎ ")}`
          : `- ${r.property ? `[${r.property.name}] ` : ""}${r.content}`,
      )
      .join("\n");
  const parts = [
    ["Team preferences (always follow):", section("PREFERENCE")],
    ["Guest information per property (use in guest messages, translated to the guest's language):", section("GUEST_INFO")],
    ["Message templates the managers wrote — imitate their structure and tone ({name} {property} {checkIn} {checkOut} are placeholders):", section("MESSAGE_TEMPLATE")],
  ].filter(([, body]) => body);
  return parts.map(([title, body]) => `${title}\n${body}`).join("\n\n").slice(0, 8000);
}
