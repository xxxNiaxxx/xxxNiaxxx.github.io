import "server-only";
import { cookies, headers } from "next/headers";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/email";
import { AppError } from "@/lib/errors";
import { hasRole, type OrgContext } from "@/lib/permissions";
import { resolveMembership } from "./membership";
import { assertAccess } from "@/lib/services/billing";
import { verifyMobileToken } from "./token";

export { resolveMembership };

export const ACTIVE_ORG_COOKIE = "apm_org";
export const ACTIVE_ORG_HEADER = "x-organization-id";

/** User id and session version from a mobile bearer token, or from the web session cookie. */
async function currentSession(): Promise<{ userId: string; sessionVersion: number } | null> {
  const authorization = (await headers()).get("authorization");
  if (authorization?.startsWith("Bearer ")) return verifyMobileToken(authorization.slice(7).trim());
  const session = await auth();
  if (!session?.user?.id) return null;
  return { userId: session.user.id, sessionVersion: (session as { sessionVersion?: number }).sessionVersion ?? 0 };
}

/** The signed-in user, or an UNAUTHORIZED error (also after "sign out everywhere"). */
export async function requireUser() {
  const session = await currentSession();
  if (!session) throw new AppError("UNAUTHORIZED", "Πρέπει να συνδεθείτε");
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, image: true, sessionVersion: true, termsVersion: true },
  });
  if (!user || user.sessionVersion !== session.sessionVersion) throw new AppError("UNAUTHORIZED", "Πρέπει να συνδεθείτε");
  const { sessionVersion: _sv, ...rest } = user;
  void _sv;
  return rest;
}

/** The active organization of the signed-in user. */
export async function requireOrganization() {
  const user = await requireUser();
  // A preference only: resolveMembership ignores organizations the user doesn't belong to.
  const preferred = (await headers()).get(ACTIVE_ORG_HEADER) ?? (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const membership = await resolveMembership(user.id, preferred);
  if (!membership) throw new AppError("FORBIDDEN", "Δεν είστε μέλος κάποιου οργανισμού");
  return { user, membership, organization: membership.organization };
}

/**
 * Tenant context used by every service call. After the free period it also
 * requires a subscription (billing, export and account routes use
 * requireOrganization / requireUser instead, so they keep working).
 */
export async function requireOrganizationMember(): Promise<OrgContext> {
  const { user, membership } = await requireOrganization();
  await assertAccess(membership.organizationId);
  return { userId: user.id, organizationId: membership.organizationId, role: membership.role };
}

/** Like requireOrganizationMember, but also enforces a minimum role. */
export async function requireRole(minimum: Role): Promise<OrgContext> {
  const ctx = await requireOrganizationMember();
  if (!hasRole(ctx, minimum)) throw new AppError("FORBIDDEN", "Δεν έχετε δικαίωμα για αυτή την ενέργεια");
  return ctx;
}

/** A signed-in user listed in ADMIN_EMAILS (manages the waitlist), or FORBIDDEN. */
export async function requirePlatformAdmin() {
  const user = await requireUser();
  if (!isPlatformAdmin(user.email)) throw new AppError("FORBIDDEN", "Μόνο οι διαχειριστές της εφαρμογής έχουν πρόσβαση");
  return user;
}
