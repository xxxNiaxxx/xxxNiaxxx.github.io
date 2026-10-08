import { readJson, route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { deleteProperty, getPropertyDetails, updateProperty } from "@/lib/services/properties";

type P = { id: string };

export const GET = route<P>(async (_req, { id }) => getPropertyDetails(await requireOrganizationMember(), id));

export const PATCH = route<P>(async (req, { id }) =>
  updateProperty(await requireOrganizationMember(), id, await readJson(req)),
);

export const DELETE = route<P>(async (_req, { id }) => {
  await deleteProperty(await requireOrganizationMember(), id);
  return { deleted: true };
});
