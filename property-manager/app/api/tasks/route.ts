import { created, readJson, route, searchParamsObject } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { createTask, listTasks } from "@/lib/services/tasks";

export const GET = route(async (req) => listTasks(await requireOrganizationMember(), searchParamsObject(req)));

export const POST = route(async (req) => {
  const ctx = await requireOrganizationMember();
  return created(await createTask(ctx, await readJson(req)));
});
