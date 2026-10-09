import { createHash, randomBytes } from "node:crypto";
import type { Prisma, WaitlistEntry, WaitlistStatus } from "@prisma/client";
import { z } from "zod";
import { APP_NAME, FREE_UNTIL_NOTE } from "@/lib/brand";
import { db } from "@/lib/db";
import { platformAdminEmails, sendEmail } from "@/lib/email";
import { AppError, conflict } from "@/lib/errors";
import { email, optionalEmail, optionalText, requiredText } from "@/lib/validation/common";
import { WAITLIST_PLATFORM_VALUES, WAITLIST_PLATFORMS } from "@/lib/waitlist-options";

export const ACCESS_DAYS = 14;
const REGISTRATION_KEY = "registrationOpen";

export const WAITLIST_REGIMES = { INDIVIDUAL: "Ιδιώτης", BUSINESS: "Επιχείρηση (με έναρξη)" } as const;
export const WAITLIST_DEVICES = { ANDROID: "Android", IPHONE: "iPhone", NONE: "Μόνο υπολογιστής" } as const;
export const WAITLIST_STATUS_LABELS: Record<WaitlistStatus, string> = {
  PENDING: "Σε αναμονή",
  APPROVED: "Εγκρίθηκε",
  REJECTED: "Απορρίφθηκε",
  REGISTERED: "Έφτιαξε λογαριασμό",
};

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const accessPath = (token: string) => `/register?access=${token}`;

export const waitlistSchema = z.object({
  name: requiredText("Ονοματεπώνυμο", 120),
  email,
  phone: optionalText(40),
  city: optionalText(80),
  propertiesCount: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.coerce.number({ error: "Δώστε αριθμό" }).int("Δώστε ακέραιο αριθμό").min(1, "Τουλάχιστον 1").max(1000, "Πολύ μεγάλος αριθμός").nullable(),
  ),
  platforms: z.array(z.enum(WAITLIST_PLATFORM_VALUES)).max(WAITLIST_PLATFORM_VALUES.length).default([]),
  regime: z.preprocess((v) => (v === "" ? null : v), z.enum(["INDIVIDUAL", "BUSINESS"]).nullish()),
  device: z.preprocess((v) => (v === "" ? null : v), z.enum(["ANDROID", "IPHONE", "NONE"]).nullish()),
  playEmail: optionalEmail,
  message: optionalText(1000),
  consent: z.literal(true, { error: "Χρειάζεται η συναίνεσή σας για να σας καταχωρίσουμε" }),
});

/** Whether anyone can create an account without an invitation or an approved waitlist link. */
export async function isRegistrationOpen() {
  const row = await db.appSetting.findUnique({ where: { key: REGISTRATION_KEY } });
  return row?.value === true;
}

export async function setRegistrationOpen(open: boolean) {
  await db.appSetting.upsert({ where: { key: REGISTRATION_KEY }, create: { key: REGISTRATION_KEY, value: open }, update: { value: open } });
  return { registrationOpen: open };
}

/**
 * Adds someone to the waitlist. Asking again with the same email updates the
 * details instead of making a second entry; the reply is the same either
 * way, so the form does not reveal who is already on the list.
 */
export async function joinWaitlist(input: unknown, origin: string, now = new Date()) {
  // Consent is required by the schema; its time is stored as consentAt.
  const { consent, ...parsed } = waitlistSchema.parse(input);
  void consent;
  // Google Play testers are added by their Google account: a Gmail address is one already.
  const playEmail = parsed.device === "ANDROID" ? (parsed.playEmail ?? (/@(gmail|googlemail)\.com$/.test(parsed.email) ? parsed.email : null)) : null;
  const data = { ...parsed, playEmail };
  const existing = await db.waitlistEntry.findUnique({ where: { email: data.email } });
  if (existing) {
    if (existing.status === "PENDING" || existing.status === "REJECTED") {
      await db.waitlistEntry.update({ where: { id: existing.id }, data: { ...data, consentAt: now } });
    }
    return { joined: true };
  }
  const entry = await db.waitlistEntry.create({ data: { ...data, consentAt: now } });

  await sendEmail({
    to: entry.email,
    subject: `Είστε στη λίστα αναμονής του ${APP_NAME}`,
    text: `Γεια σας ${entry.name},\n\nευχαριστούμε για το ενδιαφέρον σας να δοκιμάσετε το ${APP_NAME}. Σας καταχωρίσαμε στη λίστα αναμονής και θα σας στείλουμε email με τον προσωπικό σας σύνδεσμο εγγραφής μόλις ανοίξει θέση.\n\n${FREE_UNTIL_NOTE}\n\nΑν δεν κάνατε εσείς αυτή την αίτηση, απλώς αγνοήστε αυτό το μήνυμα και τα στοιχεία σας θα διαγραφούν κατόπιν αιτήματος.`,
  });
  const admins = platformAdminEmails();
  if (admins.length) {
    const platforms = entry.platforms.map((p) => WAITLIST_PLATFORMS[p] ?? p).join(", ");
    await sendEmail({
      to: admins,
      subject: `Νέα αίτηση στη λίστα αναμονής: ${entry.name}`,
      text: [
        `${entry.name} · ${entry.email}${entry.phone ? ` · ${entry.phone}` : ""}`,
        [
          entry.city,
          entry.propertiesCount ? `${entry.propertiesCount} ακίνητα` : null,
          platforms || null,
          entry.regime ? WAITLIST_REGIMES[entry.regime as keyof typeof WAITLIST_REGIMES] : null,
          entry.device ? WAITLIST_DEVICES[entry.device as keyof typeof WAITLIST_DEVICES] : null,
          entry.playEmail && entry.playEmail !== entry.email ? `Google Play: ${entry.playEmail}` : null,
        ].filter(Boolean).join(" · "),
        entry.message ?? "",
      ].filter(Boolean).join("\n\n"),
      action: { label: "Άνοιγμα λίστας αναμονής", url: `${origin}/admin/waitlist` },
    });
  }
  return { joined: true };
}

function serialize(e: WaitlistEntry, now: Date) {
  return {
    id: e.id,
    name: e.name,
    email: e.email,
    phone: e.phone,
    city: e.city,
    propertiesCount: e.propertiesCount,
    platforms: e.platforms,
    regime: e.regime,
    device: e.device,
    playEmail: e.playEmail,
    message: e.message,
    status: e.status,
    linkExpired: e.status === "APPROVED" && !!e.tokenExpiresAt && e.tokenExpiresAt <= now,
    approvedAt: e.approvedAt?.toISOString() ?? null,
    approvalEmailedAt: e.approvalEmailedAt?.toISOString() ?? null,
    registeredAt: e.registeredAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
  };
}
export type WaitlistEntryDTO = ReturnType<typeof serialize>;

export async function listWaitlist(now = new Date()) {
  const rows = await db.waitlistEntry.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map((r) => serialize(r, now));
}

async function findEntry(id: string) {
  const entry = await db.waitlistEntry.findUnique({ where: { id } });
  if (!entry) throw new AppError("NOT_FOUND", "Η αίτηση δεν βρέθηκε");
  return entry;
}

/**
 * Approves an entry (or sends a new link): creates a personal sign-up link
 * and emails it. The link is returned too, to share by hand when email is
 * not set up or did not go out.
 */
export async function approveEntry(id: string, origin: string, now = new Date()) {
  const entry = await findEntry(id);
  if (entry.status === "REGISTERED") throw conflict("Έχει ήδη φτιάξει λογαριασμό");
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(now.getTime() + ACCESS_DAYS * 86_400_000);
  await db.waitlistEntry.update({
    where: { id },
    data: { status: "APPROVED", tokenHash: hashToken(token), tokenExpiresAt: expiresAt, approvedAt: now, approvalEmailedAt: null },
  });
  const url = `${origin}${accessPath(token)}`;
  const playUrl = process.env.PLAY_TESTING_URL;
  const android =
    entry.device === "ANDROID" && playUrl
      ? `\n\nΕφαρμογή Android: αφού φτιάξετε τον λογαριασμό, ανοίξτε από το κινητό σας τον σύνδεσμο δοκιμής ${playUrl}, πατήστε «Γίνετε δοκιμαστής» και εγκαταστήστε την εφαρμογή από το Google Play. Συνδεθείτε με το ίδιο email και κωδικό.${entry.playEmail && entry.playEmail !== entry.email ? ` Στο Google Play χρησιμοποιήστε τον λογαριασμό ${entry.playEmail}.` : ""}`
      : "";
  const emailed = await sendEmail({
    to: entry.email,
    subject: `Η πρόσβασή σας στο ${APP_NAME} είναι έτοιμη`,
    text: `Γεια σας ${entry.name},\n\nσας ευχαριστούμε που περιμένατε! Μπορείτε τώρα να δημιουργήσετε τον λογαριασμό σας και να δοκιμάσετε την εφαρμογή. ${FREE_UNTIL_NOTE}\n\nΟ σύνδεσμος είναι προσωπικός, λειτουργεί μόνο με το ${entry.email} και ισχύει για ${ACCESS_DAYS} ημέρες.${android}\n\nΘα χαρούμε πολύ να ακούσουμε τη γνώμη σας: απλώς απαντήστε σε αυτό το email.`,
    action: { label: "Δημιουργία λογαριασμού", url },
  });
  if (emailed) await db.waitlistEntry.update({ where: { id }, data: { approvalEmailedAt: now } });
  return { path: accessPath(token), emailed };
}

export async function rejectEntry(id: string) {
  const entry = await findEntry(id);
  if (entry.status === "REGISTERED") throw conflict("Έχει ήδη φτιάξει λογαριασμό");
  await db.waitlistEntry.update({ where: { id }, data: { status: "REJECTED", tokenHash: null, tokenExpiresAt: null } });
}

/** Removes the entry and its personal data (e.g. on request). */
export async function deleteEntry(id: string) {
  await findEntry(id);
  await db.waitlistEntry.delete({ where: { id } });
}

export type AccessStatus = "VALID" | "EXPIRED" | "USED";

const accessStatus = (e: WaitlistEntry, now: Date): AccessStatus | null =>
  e.status === "REGISTERED" ? "USED" : e.status !== "APPROVED" ? null : e.tokenExpiresAt && e.tokenExpiresAt <= now ? "EXPIRED" : "VALID";

/** Details shown on the sign-up page for a waitlist link, or null for an unknown or withdrawn link. */
export async function getWaitlistAccess(token: string, now = new Date()) {
  const entry = await db.waitlistEntry.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!entry) return null;
  const status = accessStatus(entry, now);
  return status ? { name: entry.name, email: entry.email, status } : null;
}

const ACCESS_ERRORS: Record<Exclude<AccessStatus, "VALID">, string> = {
  EXPIRED: "Ο σύνδεσμος εγγραφής έχει λήξει. Γράψτε μας για να σας στείλουμε νέο.",
  USED: "Ο σύνδεσμος εγγραφής έχει ήδη χρησιμοποιηθεί. Συνδεθείτε.",
};

/** Uses a waitlist link for a new account. The account email must be the approved one. */
export async function claimWaitlistAccess(tx: Prisma.TransactionClient, user: { id: string; email: string }, token: string, now = new Date()) {
  const entry = await tx.waitlistEntry.findUnique({ where: { tokenHash: hashToken(token) } });
  const status = entry ? accessStatus(entry, now) : null;
  if (!entry || !status) throw new AppError("BAD_REQUEST", "Ο σύνδεσμος εγγραφής δεν είναι έγκυρος");
  if (status !== "VALID") throw new AppError("BAD_REQUEST", ACCESS_ERRORS[status]);
  if (user.email.toLowerCase() !== entry.email) throw new AppError("FORBIDDEN", `Ο σύνδεσμος είναι για το ${entry.email}. Χρησιμοποιήστε αυτό το email.`);
  const claimed = await tx.waitlistEntry.updateMany({
    where: { id: entry.id, status: "APPROVED" },
    data: { status: "REGISTERED", registeredAt: now, userId: user.id },
  });
  if (claimed.count === 0) throw new AppError("BAD_REQUEST", ACCESS_ERRORS.USED);
}

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Leading = + - @ would run as a formula in Excel.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export async function waitlistCsv() {
  const rows = await db.waitlistEntry.findMany({ orderBy: { createdAt: "asc" } });
  const header = ["Ημερομηνία", "Όνομα", "Email", "Τηλέφωνο", "Πόλη", "Ακίνητα", "Πλατφόρμες", "Καθεστώς", "Κινητό", "Email Google Play", "Σχόλιο", "Κατάσταση"];
  const lines = rows.map((r) => [
    r.createdAt.toISOString().slice(0, 10),
    r.name,
    r.email,
    r.phone,
    r.city,
    r.propertiesCount,
    r.platforms.map((p) => WAITLIST_PLATFORMS[p] ?? p).join(", "),
    r.regime ? WAITLIST_REGIMES[r.regime as keyof typeof WAITLIST_REGIMES] : "",
    r.device ? WAITLIST_DEVICES[r.device as keyof typeof WAITLIST_DEVICES] : "",
    r.playEmail,
    r.message,
    WAITLIST_STATUS_LABELS[r.status],
  ].map(csvCell).join(","));
  // BOM so Excel reads Greek correctly.
  return `﻿${[header.join(","), ...lines].join("\r\n")}\r\n`;
}
