import { route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { markReplySeen } from "@/lib/services/feedback";

/** Closes the team's answer on the home page. */
export const POST = route<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  return markReplySeen(user.id, id);
});
