import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import { registerSchema } from "@/lib/validation/auth";
import { isPlatformAdmin } from "@/lib/email";
import { acceptInvitation, getInvitationByToken } from "./invitations";
import { claimWaitlistAccess, getWaitlistAccess, isRegistrationOpen } from "./waitlist";

export const CLOSED_REGISTRATION_MESSAGE = "Η εγγραφή γίνεται προς το παρόν μόνο με πρόσκληση. Γραφτείτε στη λίστα αναμονής και θα σας στείλουμε σύνδεσμο.";

/**
 * Creates a user. With an invitation they join that team; otherwise they get
 * their own organization as OWNER. While registration is closed, a new
 * organization needs an approved waitlist link.
 */
export async function registerAccount(input: unknown) {
  const data = registerSchema.parse(input);
  // The app's administrators (ADMIN_EMAILS) are never created through sign-up:
  // emails are not verified, so anyone could otherwise claim an admin address.
  if (isPlatformAdmin(data.email)) throw new AppError("FORBIDDEN", "Αυτό το email δεν μπορεί να εγγραφεί από εδώ.");
  // Check the link first, so a made-up link cannot be used to probe which emails have accounts.
  if (data.invite) {
    if ((await getInvitationByToken(data.invite))?.status !== "VALID") throw new AppError("BAD_REQUEST", "Η πρόσκληση δεν είναι έγκυρη ή έχει λήξει.");
  } else if (data.access) {
    if ((await getWaitlistAccess(data.access))?.status !== "VALID") throw new AppError("BAD_REQUEST", "Ο σύνδεσμος εγγραφής δεν είναι έγκυρος ή έχει λήξει.");
  } else if (!(await isRegistrationOpen())) throw new AppError("FORBIDDEN", CLOSED_REGISTRATION_MESSAGE);
  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) throw conflict("Υπάρχει ήδη λογαριασμός με αυτό το email. Συνδεθείτε.");
  const passwordHash = await bcrypt.hash(data.password, 12);
  return db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email: data.email, name: data.name, passwordHash } });
    if (data.invite) {
      const { organizationId } = await acceptInvitation(tx, user, data.invite);
      return { userId: user.id, organizationId };
    }
    if (data.access) await claimWaitlistAccess(tx, user, data.access);
    const organization = await tx.organization.create({ data: { name: data.organizationName! } });
    await tx.organizationMember.create({ data: { organizationId: organization.id, userId: user.id, role: "OWNER" } });
    return { userId: user.id, organizationId: organization.id };
  });
}
