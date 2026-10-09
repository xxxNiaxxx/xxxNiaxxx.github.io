import "server-only";
import { notFound, redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { requireOrganization } from "@/lib/auth";
import type { OrgContext } from "@/lib/permissions";

/** For server components: the tenant context, or a redirect to sign-in. */
export async function getPageContext() {
  try {
    const { user, membership, organization } = await requireOrganization();
    const ctx: OrgContext = { userId: user.id, organizationId: membership.organizationId, role: membership.role };
    return { ctx, user, organization, role: membership.role };
  } catch (e) {
    if (e instanceof AppError && (e.code === "UNAUTHORIZED" || e.code === "FORBIDDEN")) redirect("/logout");
    throw e;
  }
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
