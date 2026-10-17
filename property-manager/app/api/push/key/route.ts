import { route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { vapidKeys } from "@/lib/services/push";

/** The public key the browser needs to subscribe to push notifications. */
export const GET = route(async () => {
  await requireUser();
  return { publicKey: (await vapidKeys()).publicKey };
});
