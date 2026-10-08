import { created, readJson, route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { createMessage } from "@/lib/services/messages";

export const POST = route(async (req) => {
  const ctx = await requireOrganizationMember();
  return created(await createMessage(ctx, await readJson(req)));
});
