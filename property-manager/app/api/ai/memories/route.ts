import { z } from "zod";
import { created, readJson, route, searchParamsObject } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { createMemory, listMemories } from "@/lib/ai/memory";
import { optionalQuery } from "@/lib/validation/common";

const query = z.object({
  kind: optionalQuery(z.enum(["GUEST_INFO", "PREFERENCE", "MESSAGE_TEMPLATE"])),
  propertyId: optionalQuery(z.string()),
});

export const GET = route(async (req) => listMemories(await requireOrganizationMember(), query.parse(searchParamsObject(req))));

export const POST = route(async (req) => {
  const ctx = await requireOrganizationMember();
  return created(await createMemory(ctx, await readJson(req)));
});
