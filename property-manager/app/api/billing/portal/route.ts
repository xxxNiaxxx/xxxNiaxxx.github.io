import { route } from "@/lib/api";
import { requireOrganization } from "@/lib/auth";
import { appOrigin } from "@/lib/request";
import { openPortal } from "@/lib/services/billing";

/** → { url } of the Stripe customer portal (card, invoices, cancellation). */
export const POST = route(async () => {
  const { user, membership } = await requireOrganization();
  return openPortal({ userId: user.id, organizationId: membership.organizationId, role: membership.role }, await appOrigin());
});
