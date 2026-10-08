import { route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { deleteFeed } from "@/lib/services/calendar-feeds";

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  await deleteFeed(await requireOrganizationMember(), id);
  return { deleted: true };
});
