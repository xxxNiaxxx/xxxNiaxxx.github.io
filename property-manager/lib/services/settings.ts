import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
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
