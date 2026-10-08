import { created, readJson, route, searchParamsObject } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { createGuest, listGuests } from "@/lib/services/guests";

export const GET = route(async (req) => listGuests(await requireOrganizationMember(), searchParamsObject(req)));

export const POST = route(async (req) => {
  const ctx = await requireOrganizationMember();
  return created(await createGuest(ctx, await readJson(req)));
});
