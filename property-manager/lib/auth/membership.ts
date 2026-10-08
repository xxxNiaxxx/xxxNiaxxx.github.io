import { db } from "@/lib/db";

/**
 * Resolves the organization the user is working in. The preferred id (from a
 * cookie) only chooses among the user's own memberships; it never grants access.
 */
export async function resolveMembership(userId: string, preferredOrgId?: string | null) {
  const memberships = await db.organizationMember.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { organization: { select: { id: true, name: true } } },
  });
  if (memberships.length === 0) return null;
  return memberships.find((m) => m.organizationId === preferredOrgId) ?? memberships[0];
}
