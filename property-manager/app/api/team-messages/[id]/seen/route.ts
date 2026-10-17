import { route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { markTeamMessageSeen } from "@/lib/services/team-messages";

export const POST = route<{ id: string }>(async (_req, { id }) => {
  const user = await requireUser();
  return markTeamMessageSeen(user.id, id);
});
