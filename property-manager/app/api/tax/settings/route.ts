import { readJson, route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { getTaxContext, updateTaxSettings } from "@/lib/services/tax";

export const GET = route(async () => {
  const { setting, regime, propertiesWithAma, commissionRates, businessTaxRate } = await getTaxContext(await requireOrganizationMember());
  return { setting, regime, propertiesWithAma, commissionRates, businessTaxRate };
});

export const PATCH = route(async (req) => {
  const { setting, regime, propertiesWithAma, commissionRates, businessTaxRate } = await updateTaxSettings(await requireOrganizationMember(), await readJson(req));
  return { setting, regime, propertiesWithAma, commissionRates, businessTaxRate };
});
