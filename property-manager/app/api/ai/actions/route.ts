import { z } from "zod";
import { route, searchParamsObject } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { listActions } from "@/lib/ai/actions";
import { optionalQuery } from "@/lib/validation/common";

const query = z.object({
  status: optionalQuery(z.enum(["PROPOSED", "APPROVED", "EXECUTED", "REJECTED", "FAILED"])),
  conversationId: optionalQuery(z.string()),
});

export const GET = route(async (req) => listActions(await requireOrganizationMember(), query.parse(searchParamsObject(req))));
