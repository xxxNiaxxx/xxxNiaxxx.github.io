import { route } from "@/lib/api";
import { requirePlatformAdmin } from "@/lib/auth";
import { rejectEntry } from "@/lib/services/waitlist";

export const POST = route<{ id: string }>(async (_req, { id }) => {
  await requirePlatformAdmin();
  await rejectEntry(id);
  return { rejected: true };
});
