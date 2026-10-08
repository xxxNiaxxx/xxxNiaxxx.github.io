import { created, readJson, route, searchParamsObject } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { createProperty, listProperties } from "@/lib/services/properties";

export const GET = route(async (req) => listProperties(await requireOrganizationMember(), searchParamsObject(req)));

export const POST = route(async (req) => {
  const ctx = await requireOrganizationMember();
  return created(await createProperty(ctx, await readJson(req)));
});
