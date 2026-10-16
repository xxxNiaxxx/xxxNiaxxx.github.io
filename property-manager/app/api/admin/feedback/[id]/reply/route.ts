import { readJson, route } from "@/lib/api";
import { requirePlatformAdmin } from "@/lib/auth";
import { appOrigin } from "@/lib/request";
import { replyToFeedback } from "@/lib/services/feedback";

/** The team answers a user's comment: { reply }. */
export const POST = route<{ id: string }>(async (req, { id }) => {
  await requirePlatformAdmin();
  return replyToFeedback(id, await readJson(req), await appOrigin());
});
