import type { Role } from "@prisma/client";

/** Resolved, server-side tenant context. Never built from client input. */
export interface OrgContext {
  userId: string;
  organizationId: string;
  role: Role;
}

const rank: Record<Role, number> = { MEMBER: 1, ADMIN: 2, OWNER: 3 };

export function hasRole(ctx: Pick<OrgContext, "role">, minimum: Role): boolean {
  return rank[ctx.role] >= rank[minimum];
}
