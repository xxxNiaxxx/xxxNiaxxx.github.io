import { z } from "zod";
import { readJson, route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { syncOrganizationFeeds } from "@/lib/services/calendar-feeds";

/** { propertyId?, force? } — without force only feeds not read in the last 30 minutes. */
export const POST = route(async (req) => {
  const body = z.object({ propertyId: z.string().optional(), force: z.boolean().optional() }).parse(await readJson(req).catch(() => ({})));
  return syncOrganizationFeeds(await requireOrganizationMember(), body);
});
