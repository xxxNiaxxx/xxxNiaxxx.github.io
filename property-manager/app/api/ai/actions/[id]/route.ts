import { readJson, route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { updateActionPayload } from "@/lib/ai/actions";

/** Edit a proposed action's payload (e.g. the message text) before approving it. */
export const PATCH = route<{ id: string }>(async (req, { id }) =>
  updateActionPayload(await requireOrganizationMember(), id, await readJson(req)),
);
