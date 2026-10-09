import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { TERMS_VERSION } from "@/lib/legal";
import { rateLimited } from "@/lib/request";
import { hasRole, type OrgContext } from "@/lib/permissions";
import { requiredText } from "@/lib/validation/common";

const nameSchema = z.object({ name: requiredText("Όνομα", 120) });
/** Name and/or the daily reminder and monthly report emails. */
const orgSchema = z
  .object({ name: requiredText("Όνομα", 120).optional(), emailReminders: z.boolean().optional() })
  .refine((v) => v.name !== undefined || v.emailReminders !== undefined, { message: "Δεν δόθηκε αλλαγή" });

export async function updateProfile(userId: string, input: unknown) {
  const { name } = nameSchema.parse(input);
  const user = await db.user.update({ where: { id: userId }, data: { name }, select: { id: true, name: true, email: true } });
  return user;
}

export async function updateOrganization(ctx: OrgContext, input: unknown) {
  if (!hasRole(ctx, "ADMIN")) throw new AppError("FORBIDDEN", "Μόνο ο ιδιοκτήτης και οι διαχειριστές αλλάζουν τις ρυθμίσεις του οργανισμού");
  const data = orgSchema.parse(input);
  const org = await db.organization.update({ where: { id: ctx.organizationId }, data, select: { id: true, name: true, emailReminders: true } });
  return org;
}

/** Signs the user out of every browser and phone: sessions issued before this stop working. */
export async function signOutEverywhere(userId: string) {
  await db.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
}

/** Records that the user accepted the current terms of service and data processing agreement. */
export async function acceptTerms(userId: string) {
  await db.user.update({ where: { id: userId }, data: { termsVersion: TERMS_VERSION, termsAcceptedAt: new Date() } });
  return { termsVersion: TERMS_VERSION };
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Γράψτε τον τωρινό κωδικό"),
  newPassword: z.string().min(8, "Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες").max(200),
});

/** New password; every session (this one too) has to sign in again. */
export async function changePassword(userId: string, input: unknown) {
  const data = passwordSchema.parse(input);
  if (await rateLimited(`password:${userId}`, 10, 15 * 60_000)) throw new AppError("BAD_REQUEST", "Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.");
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await bcrypt.compare(data.currentPassword, user.passwordHash))) {
    throw new AppError("VALIDATION", "Ο τωρινός κωδικός δεν είναι σωστός", [{ path: "currentPassword", message: "Λάθος κωδικός" }]);
  }
  await db.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(data.newPassword, 12), sessionVersion: { increment: 1 } } });
}
