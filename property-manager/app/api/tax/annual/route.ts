import { route, searchParamsObject } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { getAnnualReport } from "@/lib/services/tax";
import { yearQuery } from "@/lib/validation/tax";

export const GET = route(async (req) => {
  const { year, otherIncome } = yearQuery.parse(searchParamsObject(req));
  return getAnnualReport(await requireOrganizationMember(), year, otherIncome);
});
