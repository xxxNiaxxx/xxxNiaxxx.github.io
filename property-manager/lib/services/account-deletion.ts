import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Δώστε τον κωδικό σας για επιβεβαίωση"),
});

/**
 * Permanently deletes a user (Google Play / GDPR account deletion).
 *
 * - Organizations where the user is the only member are deleted with all
 *   their data (properties, guests, reservations, tasks, messages, finances, AI history).
 * - In shared organizations only the membership is removed; if the user was the
 *   last OWNER, the longest-standing ADMIN (else MEMBER) becomes OWNER so the
 *   organization is never left without one.
 */
export async function deleteAccount(userId: string, input: unknown) {
  const { password } = deleteAccountSchema.parse(input);
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("NOT_FOUND", "Ο λογαριασμός δεν βρέθηκε");
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError("VALIDATION", "Λάθος κωδικός", [{ path: "password", message: "Λάθος κωδικός" }]);
  }

  const memberships = await db.organizationMember.findMany({ where: { userId } });
  const deletedOrganizations: string[] = [];

  await db.$transaction(async (tx) => {
    for (const m of memberships) {
      const others = await tx.organizationMember.findMany({
        where: { organizationId: m.organizationId, userId: { not: userId } },
        orderBy: { createdAt: "asc" },
      });
      if (others.length === 0) {
        const organizationId = m.organizationId;
        // Reservations restrict deletion of their property/guest, so remove dependants first.
        await tx.aIAction.deleteMany({ where: { organizationId } });
        await tx.aIConversation.deleteMany({ where: { organizationId } });
        await tx.transaction.deleteMany({ where: { organizationId } });
        await tx.message.deleteMany({ where: { organizationId } });
        await tx.task.deleteMany({ where: { organizationId } });
        await tx.reservation.deleteMany({ where: { organizationId } });
        await tx.organization.delete({ where: { id: organizationId } });
        deletedOrganizations.push(organizationId);
        continue;
      }
      if (m.role === "OWNER" && !others.some((o) => o.role === "OWNER")) {
        const successor = others.find((o) => o.role === "ADMIN") ?? others[0];
        await tx.organizationMember.update({ where: { id: successor.id }, data: { role: "OWNER" } });
      }
    }
    // Memberships and the user's AI conversations cascade; task assignments and
    // AI-action audit references are set to null.
    await tx.user.delete({ where: { id: userId } });
  });

  return { deleted: true, deletedOrganizations };
}
