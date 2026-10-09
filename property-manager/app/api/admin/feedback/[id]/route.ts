import { z } from "zod";
import { readJson, route } from "@/lib/api";
import { requirePlatformAdmin } from "@/lib/auth";
import { setFeedbackResolved } from "@/lib/services/feedback";

export const PATCH = route<{ id: string }>(async (req, { id }) => {
  await requirePlatformAdmin();
  const { resolved } = z.object({ resolved: z.boolean() }).parse(await readJson(req));
  return setFeedbackResolved(id, resolved);
});
