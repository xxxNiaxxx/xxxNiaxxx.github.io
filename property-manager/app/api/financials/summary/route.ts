import { route, searchParamsObject } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { getRevenueSummary } from "@/lib/services/financials";
import { revenueQuery } from "@/lib/validation/financial";

export const GET = route(async (req) =>
  getRevenueSummary(await requireOrganizationMember(), revenueQuery.parse(searchParamsObject(req))),
);
