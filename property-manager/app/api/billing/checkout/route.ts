import { route } from "@/lib/api";
import { requireOrganization } from "@/lib/auth";
import { appOrigin } from "@/lib/request";
import { startCheckout } from "@/lib/services/billing";

/** → { url } of Stripe Checkout for a new subscription. */
export const POST = route(async () => {
  const { user, membership } = await requireOrganization();
  return startCheckout({ userId: user.id, organizationId: membership.organizationId, role: membership.role }, user, await appOrigin());
});
