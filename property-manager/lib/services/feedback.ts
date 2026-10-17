import { z } from "zod";
import { db } from "@/lib/db";
import { platformAdminEmails, sendEmail } from "@/lib/email";
import { AppError } from "@/lib/errors";
import { pushToAdmins } from "@/lib/services/push";

const KIND_LABELS = { BUG: "Πρόβλημα", IDEA: "Ιδέα", OTHER: "Σχόλιο" } as const;

const feedbackInput = z.object({
  kind: z.enum(["BUG", "IDEA", "OTHER"]).default("OTHER"),
  message: z.string().trim().min(3, "Γράψτε λίγα λόγια").max(4000),
  page: z.string().trim().max(300).optional(),
  client: z.enum(["web", "mobile"]).default("web"),
});

/** Saves a user's comment and emails the app's administrators. */
export async function submitFeedback(user: { id: string; email: string; name?: string | null }, organizationId: string | null, input: unknown, origin: string) {
  const data = feedbackInput.parse(input);
  const row = await db.feedback.create({
    data: { userId: user.id, email: user.email, organizationId, kind: data.kind, message: data.message, page: data.page ?? null, client: data.client },
  });
  await pushToAdmins({ title: `${KIND_LABELS[data.kind]} από ${user.name ?? user.email}`, body: data.message.slice(0, 140), url: "/admin/feedback", tag: "feedback" }).catch((e) =>
    console.error("feedback push", e),
  );
  const admins = platformAdminEmails();
  if (admins.length) {
    await sendEmail({
      to: admins,
      subject: `${KIND_LABELS[data.kind]} από ${user.name ?? user.email}`,
      text: `${data.message}\n\n${user.email} · ${data.client === "mobile" ? "κινητό" : "web"}${data.page ? ` · ${data.page}` : ""}`,
      action: { label: "Όλα τα σχόλια", url: `${origin}/admin/feedback` },
    });
  }
  return { id: row.id };
}

export async function listFeedback() {
  const rows = await db.feedback.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  return rows.map((f) => ({
    id: f.id,
    userId: f.userId,
    email: f.email,
    kind: f.kind,
    kindLabel: KIND_LABELS[f.kind],
    message: f.message,
    page: f.page,
    client: f.client,
    resolved: !!f.resolvedAt,
    reply: f.reply,
    repliedAt: f.repliedAt?.toISOString() ?? null,
    replySeen: !!f.replySeenAt,
    createdAt: f.createdAt.toISOString(),
  }));
}
export type FeedbackDTO = Awaited<ReturnType<typeof listFeedback>>[number];

export async function setFeedbackResolved(id: string, resolved: boolean) {
  const f = await db.feedback.findUnique({ where: { id } });
  if (!f) throw new AppError("NOT_FOUND", "Δεν βρέθηκε");
  await db.feedback.update({ where: { id }, data: { resolvedAt: resolved ? new Date() : null } });
  return { resolved };
}

const replyInput = z.object({ reply: z.string().trim().min(2, "Γράψτε την απάντηση").max(4000) });

/**
 * The team answers a comment: saved, marked done, emailed to the user (from
 * the team, never a person's name) and shown on their home page.
 */
export async function replyToFeedback(id: string, input: unknown, origin: string, now = new Date()) {
  const { reply } = replyInput.parse(input);
  const f = await db.feedback.findUnique({ where: { id } });
  if (!f) throw new AppError("NOT_FOUND", "Δεν βρέθηκε");
  await db.feedback.update({ where: { id }, data: { reply, repliedAt: now, replySeenAt: null, resolvedAt: f.resolvedAt ?? now } });
  const emailed = await sendEmail({
    to: f.email,
    subject: "Απάντηση στο σχόλιό σας",
    text: `${reply}\n\nΤο σχόλιό σας:\n«${f.message}»\n\nΑπό την ομάδα του Βραχυχρόνια.ai`,
    action: { label: "Άνοιγμα εφαρμογής", url: `${origin}/dashboard` },
  });
  return { replied: true, emailed };
}

/** Answers from the team the user has not closed yet, newest first. */
export async function unseenReplies(userId: string) {
  const rows = await db.feedback.findMany({
    where: { userId, repliedAt: { not: null }, replySeenAt: null },
    orderBy: { repliedAt: "desc" },
    take: 5,
  });
  return rows.map((f) => ({ id: f.id, message: f.message, reply: f.reply!, repliedAt: f.repliedAt!.toISOString() }));
}
export type FeedbackReplyDTO = Awaited<ReturnType<typeof unseenReplies>>[number];

/** «Εντάξει» on the home page card: only the user's own comments. */
export async function markReplySeen(userId: string, id: string, now = new Date()) {
  const { count } = await db.feedback.updateMany({ where: { id, userId }, data: { replySeenAt: now } });
  if (!count) throw new AppError("NOT_FOUND", "Δεν βρέθηκε");
  return { seen: true };
}
