import { route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { priceSuggestions } from "@/lib/services/price-suggestions";

/** Price ideas for one property (mobile app). */
export const GET = route<{ id: string }>(async (_req, { id }) => priceSuggestions(await requireOrganizationMember(), { propertyId: id }));
