import { z } from "zod";
import { readJson, route } from "@/lib/api";
import { requirePlatformAdmin } from "@/lib/auth";
import { isAutoApprove, isRegistrationOpen, setAutoApprove, setRegistrationOpen } from "@/lib/services/waitlist";
import { followUpEmailsOn, setFollowUpEmails } from "@/lib/services/welcome-emails";

export const GET = route(async () => {
  await requirePlatformAdmin();
  return { registrationOpen: await isRegistrationOpen(), autoApprove: await isAutoApprove(), followUpEmails: await followUpEmailsOn() };
});

export const PATCH = route(async (req) => {
  await requirePlatformAdmin();
  const body = z.object({ registrationOpen: z.boolean().optional(), autoApprove: z.boolean().optional(), followUpEmails: z.boolean().optional() }).parse(await readJson(req));
  return {
    ...(body.registrationOpen !== undefined ? await setRegistrationOpen(body.registrationOpen) : {}),
    ...(body.autoApprove !== undefined ? await setAutoApprove(body.autoApprove) : {}),
    ...(body.followUpEmails !== undefined ? await setFollowUpEmails(body.followUpEmails) : {}),
  };
});
