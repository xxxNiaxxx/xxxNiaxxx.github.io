import { readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { updateProfile } from "@/lib/services/settings";

export const GET = route(async () => requireUser());

export const PATCH = route(async (req) => {
  const user = await requireUser();
  return updateProfile(user.id, await readJson(req));
});
