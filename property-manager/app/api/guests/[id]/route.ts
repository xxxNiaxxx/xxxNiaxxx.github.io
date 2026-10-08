import { readJson, route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { deleteGuest, getGuestDetails, updateGuest } from "@/lib/services/guests";

type P = { id: string };

export const GET = route<P>(async (_req, { id }) => getGuestDetails(await requireOrganizationMember(), id));

export const PATCH = route<P>(async (req, { id }) => updateGuest(await requireOrganizationMember(), id, await readJson(req)));

export const DELETE = route<P>(async (_req, { id }) => {
  await deleteGuest(await requireOrganizationMember(), id);
  return { deleted: true };
});
