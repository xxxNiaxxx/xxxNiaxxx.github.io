import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { platformAdminEmails, sendEmail } from "@/lib/email";

/** At most one email per error group in this window (a recurring error still counts). */
const NOTIFY_EVERY_MS = 6 * 60 * 60_000;

/** Ids, numbers and quoted values vary between occurrences of the same error. */
function normalizeMessage(message: string) {
  return message
    .split("\n")[0]
    .replace(/\b[0-9a-f]{8,}\b|\bc[a-z0-9]{20,}\b/gi, "#")
    .replace(/\d+/g, "#")
    .replace(/"[^"]*"|'[^']*'/g, "…")
    .slice(0, 300);
}

function firstFrame(stack?: string) {
  return stack?.split("\n").find((l) => l.trim().startsWith("at "))?.trim().replace(/:\d+:\d+\)?$/, "") ?? "";
}

/**
 * Records an unexpected error and emails the app's administrators (ADMIN_EMAILS)
 * the first time a kind of error appears, again if it comes back after being
 * marked resolved, and at most every 6 hours while it keeps happening.
 * Never throws: monitoring must not break the request it reports on.
 */
export async function reportError(error: unknown, context: { source: "api" | "page" | "cron"; path?: string }, now = new Date()) {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`[${context.source}] ${context.path ?? ""}`, err);
    const message = `${err.name}: ${err.message}`.slice(0, 2000);
    const signature = createHash("sha256").update(`${context.source}|${err.name}|${normalizeMessage(err.message)}|${firstFrame(err.stack)}`).digest("hex").slice(0, 40);
    const row = await db.errorEvent.upsert({
      where: { signature },
      create: { signature, source: context.source, message, stack: err.stack?.slice(0, 8000) ?? null, path: context.path ?? null, firstSeenAt: now, lastSeenAt: now },
      update: { count: { increment: 1 }, lastSeenAt: now, message, path: context.path ?? undefined },
    });
    const reopened = row.resolvedAt !== null;
    const due = !row.notifiedAt || now.getTime() - row.notifiedAt.getTime() >= NOTIFY_EVERY_MS;
    if (!reopened && !due) return;
    await db.errorEvent.update({ where: { id: row.id }, data: { notifiedAt: now, resolvedAt: null } });
    const admins = platformAdminEmails();
    if (!admins.length) return;
    const origin = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
    await sendEmail({
      to: admins,
      subject: `Σφάλμα στην εφαρμογή${reopened ? " (ξανά)" : ""}: ${err.message.slice(0, 80)}`,
      text:
        `${message}\n\nΠού: ${context.source}${context.path ? ` ${context.path}` : ""}\nΦορές: ${row.count}` +
        `${row.count > 1 ? ` (πρώτη φορά ${row.firstSeenAt.toISOString().slice(0, 16).replace("T", " ")} UTC)` : ""}\n\n` +
        "Οι χρήστες είδαν μήνυμα «Κάτι πήγε στραβά». Τα δεδομένα τους δεν επηρεάζονται.",
      ...(origin ? { action: { label: "Όλα τα σφάλματα", url: `${origin}/admin/errors` } } : {}),
    });
  } catch (e) {
    console.error("reportError failed:", e);
  }
}

export async function listErrors() {
  const rows = await db.errorEvent.findMany({ orderBy: { lastSeenAt: "desc" }, take: 200 });
  return rows.map((e) => ({
    id: e.id,
    source: e.source,
    message: e.message,
    stack: e.stack,
    path: e.path,
    count: e.count,
    firstSeenAt: e.firstSeenAt.toISOString(),
    lastSeenAt: e.lastSeenAt.toISOString(),
    resolved: !!e.resolvedAt,
  }));
}
export type ErrorEventDTO = Awaited<ReturnType<typeof listErrors>>[number];

export async function setErrorResolved(id: string, resolved: boolean) {
  await db.errorEvent.update({ where: { id }, data: { resolvedAt: resolved ? new Date() : null } });
  return { resolved };
}
