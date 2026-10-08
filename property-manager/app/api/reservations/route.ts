import { created, readJson, route, searchParamsObject } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { createReservation, listReservations } from "@/lib/services/reservations";

export const GET = route(async (req) => listReservations(await requireOrganizationMember(), searchParamsObject(req)));

export const POST = route(async (req) => {
  const ctx = await requireOrganizationMember();
  return created(await createReservation(ctx, await readJson(req)));
});
