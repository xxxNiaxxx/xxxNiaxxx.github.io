import { route, searchParamsObject } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { listStays } from "@/lib/services/tax";
import { yearQuery } from "@/lib/validation/tax";

export const GET = route(async (req) => {
  const { year } = yearQuery.parse(searchParamsObject(req));
  return listStays(await requireOrganizationMember(), { from: `${year}-01-01`, to: `${year + 1}-01-01` });
});
