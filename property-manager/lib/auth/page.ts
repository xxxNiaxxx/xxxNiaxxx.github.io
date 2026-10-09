import "server-only";
import { notFound, redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { requireOrganization } from "@/lib/auth";
import type { OrgContext } from "@/lib/permissions";
import { assertAccess } from "@/lib/services/billing";

/**
 * For server components: the tenant context, or a redirect to sign-in. After
 * the free period, pages need a subscription (→ /billing) unless they are
 * reachable without one (billing, settings).
 */
export async function getPageContext({ withoutSubscription = false }: { withoutSubscription?: boolean } = {}) {
  let result;
  try {
    const { user, membership, organization } = await requireOrganization();
    const ctx: OrgContext = { userId: user.id, organizationId: membership.organizationId, role: membership.role };
    result = { ctx, user, organization, role: membership.role };
    if (!withoutSubscription) await assertAccess(membership.organizationId);
  } catch (e) {
    if (e instanceof AppError && (e.code === "UNAUTHORIZED" || e.code === "FORBIDDEN")) redirect("/logout");
    if (e instanceof AppError && e.code === "PAYMENT_REQUIRED") redirect("/billing");
    throw e;
  }
  return result;
}

/** Turns a service NOT_FOUND into the Next.js 404 page. */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
}
