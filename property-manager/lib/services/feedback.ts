import { z } from "zod";
import { db } from "@/lib/db";
import { platformAdminEmails, sendEmail } from "@/lib/email";
import { AppError } from "@/lib/errors";

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
    email: f.email,
    kind: f.kind,
    kindLabel: KIND_LABELS[f.kind],
    message: f.message,
    page: f.page,
    client: f.client,
    resolved: !!f.resolvedAt,
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
