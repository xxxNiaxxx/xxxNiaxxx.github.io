import { z } from "zod";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { AppError } from "@/lib/errors";
import { sendPush } from "@/lib/services/push";

/**
 * Messages from the team to users (e.g. those who have not added a property
 * yet): saved, emailed, pushed to their phone if they enabled it, and shown
 * on their home page until they close it or write back. Always from the
 * team, never a person's name. «[Όνομα]» becomes each user's first name.
 */
const input = z.object({
  userIds: z.array(z.string().min(1)).min(1, "Διαλέξτε σε ποιους").max(500),
  body: z.string().trim().min(5, "Γράψτε το μήνυμα").max(4000),
});

/** Greek first names to the vocative for «Γεια σας …!»: Αλέξης → Αλέξη, Κώστας → Κώστα, Νίκος → Νίκο. Other names stay as they are. */
export function vocative(name: string) {
  return /^[Α-Ωα-ωάέήίόύώϊϋΐΰ]+(ης|ής|ας|άς|ος|ός)$/u.test(name) ? name.slice(0, -1) : name;
}
const firstName = (name: string | null) => vocative((name ?? "").trim().split(/\s+/)[0] ?? "");
export const personalize = (body: string, name: string | null) => body.replace(/\[Όνομα\]/g, firstName(name)).replace(/ +!/g, "!");

export async function sendTeamMessage(raw: unknown, origin: string) {
  const { userIds, body } = input.parse(raw);
  const users = await db.user.findMany({ where: { id: { in: [...new Set(userIds)] } }, select: { id: true, name: true, email: true } });
  if (!users.length) throw new AppError("NOT_FOUND", "Δεν βρέθηκαν χρήστες");
  let emailed = 0;
  for (const u of users) {
    const text = personalize(body, u.name);
    const ok = await sendEmail({
      to: u.email,
      subject: "Μήνυμα από την ομάδα του Βραχυχρόνια.ai",
      text,
      action: { label: "Άνοιγμα εφαρμογής", url: `${origin}/dashboard` },
    });
    if (ok) emailed++;
    await db.teamMessage.create({ data: { userId: u.id, body: text, emailed: ok } });
    await sendPush([u.id], { title: "Μήνυμα από την ομάδα του Βραχυχρόνια.ai", body: text.slice(0, 140), url: "/dashboard", tag: "team" }).catch(() => 0);
  }
  return { sent: users.length, emailed };
}

/** Messages the user has not closed yet, newest first. */
export async function unseenTeamMessages(userId: string) {
  const rows = await db.teamMessage.findMany({ where: { userId, seenAt: null }, orderBy: { createdAt: "desc" }, take: 5 });
  return rows.map((m) => ({ id: m.id, body: m.body, createdAt: m.createdAt.toISOString() }));
}
export type TeamMessageDTO = Awaited<ReturnType<typeof unseenTeamMessages>>[number];

export async function markTeamMessageSeen(userId: string, id: string, now = new Date()) {
  const { count } = await db.teamMessage.updateMany({ where: { id, userId }, data: { seenAt: now } });
  if (!count) throw new AppError("NOT_FOUND", "Δεν βρέθηκε");
  return { seen: true };
}

/** When each of these users last got a message from the team (for the waitlist cards). */
export async function lastTeamMessageAt(userIds: string[]) {
  if (!userIds.length) return new Map<string, Date>();
  const rows = await db.teamMessage.groupBy({ by: ["userId"], where: { userId: { in: userIds } }, _max: { createdAt: true } });
  return new Map(rows.map((r) => [r.userId, r._max.createdAt!]));
}
