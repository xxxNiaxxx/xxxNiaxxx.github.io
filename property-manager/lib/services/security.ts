import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { APP_NAME } from "@/lib/brand";
import { decryptField, encryptField } from "@/lib/crypto/fields";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { AppError, badRequest } from "@/lib/errors";
import type { OrgContext } from "@/lib/permissions";
import { hashRecoveryCode, newRecoveryCodes, newTotpSecret, totpUri, verifyTotp } from "@/lib/auth/totp";
import { sendPush } from "./push";

// ─── Devices ─────────────────────────────────────────────────────────

/** "Chrome · Android", "Safari · iPhone", "Εφαρμογή κινητού · Android" from the user agent. */
export function deviceLabel(userAgent: string | null | undefined, client: "web" | "app" = "web") {
  const ua = userAgent ?? "";
  const os = /iPhone|iPad|iOS/i.test(ua)
    ? "iPhone"
    : /Android/i.test(ua)
      ? "Android"
      : /Windows/i.test(ua)
        ? "Windows"
        : /Mac OS|Macintosh/i.test(ua)
          ? "Mac"
          : /Linux/i.test(ua)
            ? "Linux"
            : null;
  if (client === "app") return ["Εφαρμογή κινητού", os].filter(Boolean).join(" · ");
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /SamsungBrowser/.test(ua)
      ? "Samsung Internet"
      : /OPR\/|Opera/.test(ua)
        ? "Opera"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Chrome\/|CriOS/.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : null;
  return [browser ?? "Πρόγραμμα περιήγησης", os].filter(Boolean).join(" · ");
}

/** The IP without its last part (enough to recognise a place, not a person). */
export function maskIp(ip: string | null | undefined) {
  if (!ip || ip === "unknown") return null;
  if (ip.includes(".")) return ip.split(".").slice(0, 3).concat("x").join(".");
  return `${ip.split(":").slice(0, 3).join(":")}::`;
}

// ─── Sign-ins ────────────────────────────────────────────────────────

export type LoginInfo = { userAgent: string | null; ip: string | null; client: "web" | "app" };

/**
 * Records a successful sign-in. From a browser/device the user has not used
 * in the last 6 months (and not their very first sign-in) it emails them and
 * sends a push notification, so a stranger's sign-in is noticed at once.
 */
export async function recordLogin(user: { id: string; email: string }, info: LoginInfo, now = new Date()) {
  const device = deviceLabel(info.userAgent, info.client);
  const deviceKey = createHash("sha256").update(device).digest("hex").slice(0, 32);
  const [seenBefore, anyBefore] = await Promise.all([
    db.securityEvent.findFirst({ where: { userId: user.id, kind: "LOGIN", deviceKey, createdAt: { gte: new Date(now.getTime() - 180 * 86_400_000) } }, select: { id: true } }),
    db.securityEvent.findFirst({ where: { userId: user.id, kind: "LOGIN" }, select: { id: true } }),
  ]);
  const ip = maskIp(info.ip);
  await db.securityEvent.create({ data: { userId: user.id, kind: "LOGIN", device, deviceKey, ip, createdAt: now } });
  if (seenBefore || !anyBefore) return { newDevice: false };
  const when = now.toLocaleString("el-GR", { timeZone: "Europe/Athens", dateStyle: "medium", timeStyle: "short" });
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "";
  await Promise.allSettled([
    sendEmail({
      to: user.email,
      subject: `Νέα σύνδεση στο ${APP_NAME}`,
      text: [
        `Έγινε σύνδεση στον λογαριασμό σας από νέα συσκευή:`,
        `${device}${ip ? ` · δίκτυο ${ip}` : ""} · ${when}`,
        `Αν ήσασταν εσείς, δεν χρειάζεται να κάνετε τίποτα.`,
        `Αν ΔΕΝ ήσασταν εσείς: αλλάξτε αμέσως τον κωδικό σας από τις Ρυθμίσεις (αυτό αποσυνδέει όλες τις συσκευές) και ενεργοποιήστε τον κωδικό 2 βημάτων.`,
      ].join("\n\n"),
      action: { label: "Ρυθμίσεις ασφάλειας", url: `${origin}/settings#security` },
    }),
    sendPush([user.id], { title: "Νέα σύνδεση στον λογαριασμό σας", body: `${device} · ${when}. Αν δεν ήσασταν εσείς, αλλάξτε τον κωδικό σας.`, url: "/settings#security", tag: "new-login" }, now),
  ]);
  return { newDevice: true };
}

export async function listLogins(userId: string, take = 10) {
  const rows = await db.securityEvent.findMany({ where: { userId, kind: "LOGIN" }, orderBy: { createdAt: "desc" }, take });
  return rows.map((r) => ({ id: r.id, device: r.device, ip: r.ip, at: r.createdAt.toISOString() }));
}

// ─── Downloads of guest data ─────────────────────────────────────────

export const EXPORT_LABELS = {
  "tax-stays": "Διαμονές (CSV)",
  "tax-annual": "Ετήσια σύνοψη (CSV)",
  accountant: "Πακέτο λογιστή (Excel)",
  "data-export": "Όλα τα δεδομένα (JSON)",
} as const;
export type ExportKind = keyof typeof EXPORT_LABELS;

export async function recordExport(ctx: OrgContext, what: ExportKind, details: Prisma.InputJsonObject = {}) {
  await db.securityEvent.create({ data: { userId: ctx.userId, organizationId: ctx.organizationId, kind: "EXPORT", details: { what, ...details } } });
}

/** For administrators: who downloaded files with guest data, and when. */
export async function listExports(ctx: OrgContext, take = 30) {
  const rows = await db.securityEvent.findMany({
    where: { organizationId: ctx.organizationId, kind: "EXPORT" },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map((r) => {
    const d = (r.details ?? {}) as { what?: ExportKind; year?: number };
    return {
      id: r.id,
      who: r.user ? (r.user.name ?? r.user.email) : "—",
      what: (d.what && EXPORT_LABELS[d.what]) ?? "Αρχείο",
      year: d.year ?? null,
      at: r.createdAt.toISOString(),
    };
  });
}

// ─── Two-step sign-in ────────────────────────────────────────────────

/** Thrown at sign-in: "totp" = a code is needed, "totp-invalid" = the code was wrong. */
export type SecondStep = "ok" | "totp" | "totp-invalid";

/** Checks the second step for a user whose password was right. */
export async function checkSecondStep(user: { id: string; totpEnabledAt: Date | null; totpSecret: string | null; totpLastStep: number | null; totpRecovery: string[] }, code: string | null | undefined, now = Date.now()): Promise<SecondStep> {
  if (!user.totpEnabledAt || !user.totpSecret) return "ok";
  if (!code?.trim()) return "totp";
  const step = verifyTotp(decryptField(user.totpSecret), code, now, user.totpLastStep);
  if (step !== null) {
    // Conditional, so the same code cannot be used twice even at the same moment.
    const { count } = await db.user.updateMany({ where: { id: user.id, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] }, data: { totpLastStep: step } });
    return count ? "ok" : "totp-invalid";
  }
  const hash = hashRecoveryCode(code);
  if (user.totpRecovery.includes(hash)) {
    await db.user.update({ where: { id: user.id }, data: { totpRecovery: user.totpRecovery.filter((h) => h !== hash) } });
    return "ok";
  }
  return "totp-invalid";
}

export async function twoStepStatus(userId: string) {
  const u = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { totpEnabledAt: true, totpRecovery: true } });
  return { enabled: !!u.totpEnabledAt, enabledAt: u.totpEnabledAt?.toISOString() ?? null, recoveryCodesLeft: u.totpRecovery.length };
}

/** Step 1: a new secret (not active until confirmed with a code from the app). */
export async function startTwoStep(userId: string) {
  const u = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, totpEnabledAt: true } });
  if (u.totpEnabledAt) throw badRequest("Ο κωδικός 2 βημάτων είναι ήδη ενεργός.");
  const secret = newTotpSecret();
  await db.user.update({ where: { id: userId }, data: { totpSecret: encryptField(secret), totpLastStep: null } });
  return { secret, uri: totpUri(secret, u.email, APP_NAME) };
}

/** Step 2: the code from the app turns it on; returns the recovery codes (shown once). */
export async function confirmTwoStep(userId: string, input: unknown, now = Date.now()) {
  const { code } = z.object({ code: z.string().trim().min(6).max(12) }).parse(input);
  const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (u.totpEnabledAt) throw badRequest("Ο κωδικός 2 βημάτων είναι ήδη ενεργός.");
  if (!u.totpSecret) throw badRequest("Ξεκινήστε πρώτα την ενεργοποίηση.");
  const step = verifyTotp(decryptField(u.totpSecret), code, now);
  if (step === null) throw new AppError("VALIDATION", "Ο κωδικός δεν είναι σωστός. Δοκιμάστε τον τρέχοντα κωδικό της εφαρμογής.");
  const codes = newRecoveryCodes();
  await db.user.update({ where: { id: userId }, data: { totpEnabledAt: new Date(now), totpLastStep: step, totpRecovery: codes.map(hashRecoveryCode) } });
  await db.securityEvent.create({ data: { userId, kind: "TOTP_ENABLED" } });
  return { recoveryCodes: codes };
}

/** Turning it off needs the account password. */
export async function disableTwoStep(userId: string, input: unknown) {
  const { password } = z.object({ password: z.string().min(1) }).parse(input);
  const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await bcrypt.compare(password, u.passwordHash))) throw new AppError("VALIDATION", "Λάθος κωδικός πρόσβασης.");
  await db.user.update({ where: { id: userId }, data: { totpEnabledAt: null, totpSecret: null, totpLastStep: null, totpRecovery: [] } });
  await db.securityEvent.create({ data: { userId, kind: "TOTP_DISABLED" } });
}
