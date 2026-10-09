import { readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { changePassword } from "@/lib/services/settings";

/** { currentPassword, newPassword } — signs out every device afterwards. */
export const POST = route(async (req) => {
  const user = await requireUser();
  await changePassword(user.id, await readJson(req));
  return { ok: true };
});
