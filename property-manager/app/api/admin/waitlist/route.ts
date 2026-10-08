import { route } from "@/lib/api";
import { requirePlatformAdmin } from "@/lib/auth";
import { listWaitlist } from "@/lib/services/waitlist";

export const GET = route(async () => {
  await requirePlatformAdmin();
  return listWaitlist();
});
