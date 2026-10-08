import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { conflict } from "@/lib/errors";
import { registerSchema } from "@/lib/validation/auth";
import { acceptInvitation } from "./invitations";

/**
 * Creates a user. With an invitation they join that team; otherwise they get
 * their own organization as OWNER.
 */
export async function registerAccount(input: unknown) {
  const data = registerSchema.parse(input);
  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) throw conflict("Υπάρχει ήδη λογαριασμός με αυτό το email. Συνδεθείτε.");
  const passwordHash = await bcrypt.hash(data.password, 12);
  return db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email: data.email, name: data.name, passwordHash } });
    if (data.invite) {
      const { organizationId } = await acceptInvitation(tx, user, data.invite);
      return { userId: user.id, organizationId };
    }
    const organization = await tx.organization.create({ data: { name: data.organizationName! } });
    await tx.organizationMember.create({ data: { organizationId: organization.id, userId: user.id, role: "OWNER" } });
    return { userId: user.id, organizationId: organization.id };
  });
}
