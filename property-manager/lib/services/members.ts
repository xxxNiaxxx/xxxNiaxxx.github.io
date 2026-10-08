import { z } from "zod";
import { db } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import { hasRole, type OrgContext } from "@/lib/permissions";
import { invitableRole } from "./invitations";

export async function listMembers(ctx: OrgContext) {
  const rows = await db.organizationMember.findMany({
    where: { organizationId: ctx.organizationId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((m) => ({
    userId: m.user.id,
    name: m.user.name ?? m.user.email,
    email: m.user.email,
    role: m.role,
    joinedAt: m.createdAt.toISOString(),
  }));
}
export type MemberDTO = Awaited<ReturnType<typeof listMembers>>[number];

async function findMember(ctx: OrgContext, userId: string) {
  const member = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: ctx.organizationId, userId } },
  });
  if (!member) throw notFound("Team member");
  return member;
}

/** Only the owner changes roles; the owner's own role is fixed. */
export async function updateMemberRole(ctx: OrgContext, userId: string, input: unknown) {
  const { role } = z.object({ role: invitableRole }).parse(input);
  if (ctx.role !== "OWNER") throw new AppError("FORBIDDEN", "Μόνο ο ιδιοκτήτης αλλάζει ρόλους");
  const member = await findMember(ctx, userId);
  if (member.role === "OWNER") throw new AppError("FORBIDDEN", "Ο ρόλος του ιδιοκτήτη δεν αλλάζει");
  await db.organizationMember.update({ where: { id: member.id }, data: { role } });
  return { userId, role };
}

/**
 * Removes someone from the team (or lets a member leave). Admins remove
 * members; only the owner removes admins; the owner cannot be removed.
 * Their open tasks in this organization become unassigned.
 */
export async function removeMember(ctx: OrgContext, userId: string) {
  const member = await findMember(ctx, userId);
  if (member.role === "OWNER") {
    throw new AppError("FORBIDDEN", userId === ctx.userId ? "Ο ιδιοκτήτης δεν μπορεί να αποχωρήσει από την ομάδα" : "Ο ιδιοκτήτης δεν αφαιρείται από την ομάδα");
  }
  if (userId !== ctx.userId) {
    if (!hasRole(ctx, "ADMIN")) throw new AppError("FORBIDDEN", "Μόνο ο ιδιοκτήτης και οι διαχειριστές αφαιρούν μέλη");
    if (member.role === "ADMIN" && ctx.role !== "OWNER") throw new AppError("FORBIDDEN", "Μόνο ο ιδιοκτήτης αφαιρεί διαχειριστές");
  }
  await db.$transaction([
    db.task.updateMany({
      where: { organizationId: ctx.organizationId, assignedToUserId: userId, status: { in: ["TODO", "IN_PROGRESS"] } },
      data: { assignedToUserId: null },
    }),
    db.organizationMember.delete({ where: { id: member.id } }),
  ]);
}
