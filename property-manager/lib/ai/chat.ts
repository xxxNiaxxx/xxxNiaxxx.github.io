import { db } from "@/lib/db";
import { todayISO, APP_TIMEZONE } from "@/lib/dates";
import { notFound } from "@/lib/errors";
import type { OrgContext } from "@/lib/permissions";
import { listActions } from "./actions";
import { runOfflineAssistant, type ToolTrace } from "./offline";
import { getProvider, type ChatMessage, type ChatProvider } from "./provider";
import { runTool, toolSpecs, type ToolContext } from "./tools";

const MAX_TOOL_ROUNDS = 6;
const MAX_TOOL_RESULT_CHARS = 12_000;
const HISTORY_LIMIT = 20;

function systemPrompt(orgName: string, userName: string, now: Date) {
  return [
    `You are the AI operations manager for "${orgName}", a short-term rental business. You are talking to ${userName}.`,
    `Today is ${todayISO(now)} (time zone ${APP_TIMEZONE}). Amounts are in EUR unless stated.`,
    "Rules:",
    "- Every fact about properties, reservations, guests, tasks, messages or money MUST come from a tool call in this conversation. Never guess or invent data. If a tool returns nothing, say so.",
    "- You cannot change data directly. create_task and create_message_draft only PROPOSE an action; tell the user it is waiting for their approval below the chat.",
    "- Before drafting a message, look up the guest (list_guests) and, when relevant, their reservation to get ids.",
    "- Always reply in Greek (Ελληνικά), unless the user writes in another language. Use Greek date formats (e.g. 8 Οκτωβρίου) and euro amounts like 1.234 €.",
    "- Guest messages you draft MUST be written in the guest's language: use the `language` field (ISO 639-1) returned for the guest by list_guests/get_guest — e.g. de → German, fr → French, el → Greek. Only use another language if the user explicitly asks. Tell the user (in Greek) which language you used.",
    "- Be concise and actionable. Prefer short numbered lists. Mention property names and dates.",
  ].join("\n");
}

export interface ChatOptions {
  /** Inject a provider (tests); `null` forces the offline assistant. Defaults to env config. */
  provider?: ChatProvider | null;
  now?: Date;
}

async function findConversation(ctx: OrgContext, id: string) {
  const conv = await db.aIConversation.findFirst({
    where: { id, organizationId: ctx.organizationId, userId: ctx.userId },
  });
  if (!conv) throw notFound("Conversation");
  return conv;
}

export async function listConversations(ctx: OrgContext) {
  const rows = await db.aIConversation.findMany({
    where: { organizationId: ctx.organizationId, userId: ctx.userId },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });
  return rows.map((c) => ({ id: c.id, title: c.title, updatedAt: c.updatedAt.toISOString() }));
}

export async function getConversation(ctx: OrgContext, id: string) {
  const conv = await findConversation(ctx, id);
  const [messages, actions] = await Promise.all([
    db.aIMessage.findMany({
      where: { conversationId: id, role: { in: ["USER", "ASSISTANT"] } },
      orderBy: { createdAt: "asc" },
    }),
    listActions(ctx, { conversationId: id }),
  ]);
  return {
    id: conv.id,
    title: conv.title,
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
    actions,
  };
}
export type ConversationDTO = Awaited<ReturnType<typeof getConversation>>;

export async function deleteConversation(ctx: OrgContext, id: string) {
  await findConversation(ctx, id);
  await db.aIConversation.delete({ where: { id } });
}

function truncate(value: unknown) {
  const s = JSON.stringify(value);
  return s.length > MAX_TOOL_RESULT_CHARS ? `${s.slice(0, MAX_TOOL_RESULT_CHARS)}…(truncated)` : s;
}

/** Handles one user turn: stores it, runs the model/tool loop, stores the answer. */
export async function sendChatMessage(
  ctx: OrgContext,
  input: { conversationId?: string | null; message: string },
  options: ChatOptions = {},
) {
  const now = options.now ?? new Date();
  const provider = options.provider === undefined ? getProvider() : options.provider;

  const conversation = input.conversationId
    ? await findConversation(ctx, input.conversationId)
    : await db.aIConversation.create({
        data: {
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          title: input.message.slice(0, 60) + (input.message.length > 60 ? "…" : ""),
        },
      });

  const history = await db.aIMessage.findMany({
    where: { conversationId: conversation.id, role: { in: ["USER", "ASSISTANT"] } },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });
  await db.aIMessage.create({ data: { conversationId: conversation.id, role: "USER", content: input.message } });

  const tc: ToolContext = { org: ctx, conversationId: conversation.id, now };
  let reply: string;
  let trace: ToolTrace[] = [];
  let mode: "llm" | "offline" = "offline";

  if (provider) {
    mode = "llm";
    try {
      ({ reply, trace } = await runModel(provider, ctx, history.reverse(), input.message, tc));
    } catch (error) {
      console.error("AI provider error", error);
      reply = "Δεν ήταν δυνατή η σύνδεση με τον πάροχο AI. Δοκιμάστε ξανά σε λίγο.";
    }
  } else {
    ({ reply, trace } = await runOfflineAssistant(input.message, tc));
  }

  if (trace.length) {
    await db.aIMessage.createMany({
      data: trace.map((t) => ({
        conversationId: conversation.id,
        role: "TOOL" as const,
        content: truncate({ tool: t.name, args: t.args, result: t.result }),
      })),
    });
  }
  const assistant = await db.aIMessage.create({
    data: { conversationId: conversation.id, role: "ASSISTANT", content: reply },
  });
  await db.aIConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

  return {
    conversationId: conversation.id,
    mode,
    message: { id: assistant.id, role: "assistant" as const, content: reply, createdAt: assistant.createdAt.toISOString() },
    toolsUsed: trace.map((t) => t.name),
    actions: await listActions(ctx, { conversationId: conversation.id }),
  };
}

async function runModel(
  provider: ChatProvider,
  ctx: OrgContext,
  history: { role: string; content: string }[],
  message: string,
  tc: ToolContext,
) {
  const [org, user] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: ctx.organizationId }, select: { name: true } }),
    db.user.findUniqueOrThrow({ where: { id: ctx.userId }, select: { name: true, email: true } }),
  ]);
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt(org.name, user.name ?? user.email, tc.now) },
    ...history.map((m) =>
      m.role === "USER" ? { role: "user" as const, content: m.content } : { role: "assistant" as const, content: m.content },
    ),
    { role: "user", content: message },
  ];
  const specs = toolSpecs();
  const trace: ToolTrace[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const out = await provider.complete({ messages, tools: specs });
    messages.push(out);
    if (!out.tool_calls?.length) return { reply: out.content?.trim() || "Δεν έχω απάντηση για αυτό.", trace };
    for (const call of out.tool_calls) {
      let args: unknown = {};
      try {
        args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
      } catch {
        args = null;
      }
      const result = args === null ? { error: "Arguments were not valid JSON" } : await runTool(call.function.name, args, tc);
      trace.push({ name: call.function.name, args, result });
      messages.push({ role: "tool", tool_call_id: call.id, content: truncate(result) });
    }
  }
  return { reply: "Χρειάστηκαν πολλά βήματα. Μπορείτε να κάνετε πιο συγκεκριμένη ερώτηση;", trace };
}
