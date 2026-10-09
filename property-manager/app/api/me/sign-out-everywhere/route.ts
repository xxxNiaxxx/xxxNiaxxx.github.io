import { route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { signOutEverywhere } from "@/lib/services/settings";

/** Signs the user out on every device, this one included. */
export const POST = route(async () => {
  const user = await requireUser();
  await signOutEverywhere(user.id);
  return { ok: true };
});
