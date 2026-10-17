import { z } from "zod";
import { readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { removePushSubscription, savePushSubscription } from "@/lib/services/push";

/** This browser wants push notifications: the PushSubscription JSON. */
export const POST = route(async (req) => {
  const user = await requireUser();
  return savePushSubscription(user.id, await readJson(req), req.headers.get("user-agent"));
});

/** «Απενεργοποίηση» on this browser: { endpoint }. */
export const DELETE = route(async (req) => {
  const user = await requireUser();
  const { endpoint } = z.object({ endpoint: z.string().max(1000) }).parse(await readJson(req));
  return removePushSubscription(user.id, endpoint);
});
