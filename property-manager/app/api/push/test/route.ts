import { route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { sendTestPush } from "@/lib/services/push";

export const POST = route(async () => {
  const user = await requireUser();
  return sendTestPush(user.id);
});
