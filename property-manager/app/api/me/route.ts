import { readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { deleteAccount } from "@/lib/services/account-deletion";
import { updateProfile } from "@/lib/services/settings";

export const GET = route(async () => requireUser());

export const PATCH = route(async (req) => {
  const user = await requireUser();
  return updateProfile(user.id, await readJson(req));
});

/** Permanently deletes the signed-in user's account. Body: `{ password }`. */
export const DELETE = route(async (req) => {
  const user = await requireUser();
  return deleteAccount(user.id, await readJson(req));
});
