import { route } from "@/lib/api";
import { requirePlatformAdmin } from "@/lib/auth";
import { appOrigin } from "@/lib/request";
import { approveEntry } from "@/lib/services/waitlist";

export const POST = route<{ id: string }>(async (_req, { id }) => {
  await requirePlatformAdmin();
  return approveEntry(id, await appOrigin());
});
