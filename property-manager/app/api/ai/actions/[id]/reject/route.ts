import { route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { rejectAction } from "@/lib/ai/actions";

export const POST = route<{ id: string }>(async (_req, { id }) => rejectAction(await requireOrganizationMember(), id));
