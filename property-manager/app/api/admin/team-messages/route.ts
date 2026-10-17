import { readJson, route } from "@/lib/api";
import { requirePlatformAdmin } from "@/lib/auth";
import { appOrigin } from "@/lib/request";
import { sendTeamMessage } from "@/lib/services/team-messages";

/** { userIds, body }: a message from the team to these users. */
export const POST = route(async (req) => {
  await requirePlatformAdmin();
  return sendTeamMessage(await readJson(req), await appOrigin());
});
