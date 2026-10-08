import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { conflict } from "@/lib/errors";
import { registerSchema } from "@/lib/validation/auth";

/** Creates a user, their organization and an OWNER membership. */
export async function registerAccount(input: unknown) {
  const data = registerSchema.parse(input);
  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) throw conflict("An account with this email already exists. Sign in instead.");
  const passwordHash = await bcrypt.hash(data.password, 12);
  return db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email: data.email, name: data.name, passwordHash } });
    const organization = await tx.organization.create({ data: { name: data.organizationName } });
    await tx.organizationMember.create({ data: { organizationId: organization.id, userId: user.id, role: "OWNER" } });
    return { userId: user.id, organizationId: organization.id };
  });
}
