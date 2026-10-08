import { created, readJson, route, searchParamsObject } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { createTransaction, listTransactions } from "@/lib/services/financials";
import { revenueQuery } from "@/lib/validation/financial";

export const GET = route(async (req) =>
  listTransactions(await requireOrganizationMember(), revenueQuery.parse(searchParamsObject(req))),
);

export const POST = route(async (req) => {
  const ctx = await requireOrganizationMember();
  return created(await createTransaction(ctx, await readJson(req)));
});
