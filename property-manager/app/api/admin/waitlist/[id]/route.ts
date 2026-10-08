import { route } from "@/lib/api";
import { requirePlatformAdmin } from "@/lib/auth";
import { deleteEntry } from "@/lib/services/waitlist";

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  await requirePlatformAdmin();
  await deleteEntry(id);
  return { deleted: true };
});
