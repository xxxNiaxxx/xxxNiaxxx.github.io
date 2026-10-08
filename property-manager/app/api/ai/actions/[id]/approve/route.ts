import { route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { approveAction } from "@/lib/ai/actions";

export const POST = route<{ id: string }>(async (_req, { id }) => approveAction(await requireOrganizationMember(), id));
