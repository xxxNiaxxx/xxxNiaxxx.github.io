import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { hasRole, type OrgContext } from "@/lib/permissions";
import { requiredText } from "@/lib/validation/common";

const nameSchema = z.object({ name: requiredText("Όνομα", 120) });

export async function updateProfile(userId: string, input: unknown) {
  const { name } = nameSchema.parse(input);
  const user = await db.user.update({ where: { id: userId }, data: { name }, select: { id: true, name: true, email: true } });
  return user;
}

export async function updateOrganization(ctx: OrgContext, input: unknown) {
  if (!hasRole(ctx, "ADMIN")) throw new AppError("FORBIDDEN", "Μόνο ο ιδιοκτήτης και οι διαχειριστές μπορούν να μετονομάσουν τον οργανισμό");
  const { name } = nameSchema.parse(input);
  const org = await db.organization.update({ where: { id: ctx.organizationId }, data: { name }, select: { id: true, name: true } });
  return org;
}
