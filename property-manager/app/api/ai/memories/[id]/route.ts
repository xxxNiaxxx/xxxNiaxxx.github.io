import { readJson, route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { deleteMemory, updateMemory } from "@/lib/ai/memory";

type P = { id: string };

export const PATCH = route<P>(async (req, { id }) => updateMemory(await requireOrganizationMember(), id, await readJson(req)));

export const DELETE = route<P>(async (_req, { id }) => {
  await deleteMemory(await requireOrganizationMember(), id);
  return { deleted: true };
});
