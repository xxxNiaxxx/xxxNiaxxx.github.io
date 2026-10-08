import { readJson, route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { deleteTask, getTask, updateTask } from "@/lib/services/tasks";

type P = { id: string };

export const GET = route<P>(async (_req, { id }) => getTask(await requireOrganizationMember(), id));

export const PATCH = route<P>(async (req, { id }) => updateTask(await requireOrganizationMember(), id, await readJson(req)));

export const DELETE = route<P>(async (_req, { id }) => {
  await deleteTask(await requireOrganizationMember(), id);
  return { deleted: true };
});
