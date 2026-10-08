import { db } from "@/lib/db";
import type { OrgContext } from "@/lib/permissions";

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
