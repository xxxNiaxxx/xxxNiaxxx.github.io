import { z } from "zod";
import { readJson, route } from "@/lib/api";
import { requirePlatformAdmin } from "@/lib/auth";
import { isRegistrationOpen, setRegistrationOpen } from "@/lib/services/waitlist";

export const GET = route(async () => {
  await requirePlatformAdmin();
  return { registrationOpen: await isRegistrationOpen() };
});

export const PATCH = route(async (req) => {
  await requirePlatformAdmin();
  const { registrationOpen } = z.object({ registrationOpen: z.boolean() }).parse(await readJson(req));
  return setRegistrationOpen(registrationOpen);
});
