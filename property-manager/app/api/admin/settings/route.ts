import { z } from "zod";
import { readJson, route } from "@/lib/api";
import { requirePlatformAdmin } from "@/lib/auth";
import { isAutoApprove, isRegistrationOpen, setAutoApprove, setRegistrationOpen } from "@/lib/services/waitlist";

export const GET = route(async () => {
  await requirePlatformAdmin();
  return { registrationOpen: await isRegistrationOpen(), autoApprove: await isAutoApprove() };
});

export const PATCH = route(async (req) => {
  await requirePlatformAdmin();
  const body = z.object({ registrationOpen: z.boolean().optional(), autoApprove: z.boolean().optional() }).parse(await readJson(req));
  return {
    ...(body.registrationOpen !== undefined ? await setRegistrationOpen(body.registrationOpen) : {}),
    ...(body.autoApprove !== undefined ? await setAutoApprove(body.autoApprove) : {}),
  };
});
