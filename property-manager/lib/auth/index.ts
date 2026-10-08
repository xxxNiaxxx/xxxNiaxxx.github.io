import "server-only";
import { cookies, headers } from "next/headers";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { hasRole, type OrgContext } from "@/lib/permissions";
import { resolveMembership } from "./membership";
import { verifyMobileToken } from "./token";

export { resolveMembership };

export const ACTIVE_ORG_COOKIE = "apm_org";
export const ACTIVE_ORG_HEADER = "x-organization-id";

/** User id from a mobile bearer token, or from the web session cookie. */
async function currentUserId(): Promise<string | null> {
  const authorization = (await headers()).get("authorization");
  if (authorization?.startsWith("Bearer ")) return verifyMobileToken(authorization.slice(7).trim());
  const session = await auth();
  return session?.user?.id ?? null;
}

/** The signed-in user, or an UNAUTHORIZED error. */
export async function requireUser() {
  const userId = await currentUserId();
  if (!userId) throw new AppError("UNAUTHORIZED", "You need to sign in");
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, image: true },
  });
  if (!user) throw new AppError("UNAUTHORIZED", "You need to sign in");
  return user;
}

/** The active organization of the signed-in user. */
export async function requireOrganization() {
  const user = await requireUser();
  // A preference only: resolveMembership ignores organizations the user doesn't belong to.
  const preferred = (await headers()).get(ACTIVE_ORG_HEADER) ?? (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const membership = await resolveMembership(user.id, preferred);
  if (!membership) throw new AppError("FORBIDDEN", "You are not a member of any organization");
  return { user, membership, organization: membership.organization };
}

/** Tenant context used by every service call. */
export async function requireOrganizationMember(): Promise<OrgContext> {
  const { user, membership } = await requireOrganization();
  return { userId: user.id, organizationId: membership.organizationId, role: membership.role };
}

/** Like requireOrganizationMember, but also enforces a minimum role. */
export async function requireRole(minimum: Role): Promise<OrgContext> {
  const ctx = await requireOrganizationMember();
  if (!hasRole(ctx, minimum)) throw new AppError("FORBIDDEN", "You do not have permission to do this");
  return ctx;
}
