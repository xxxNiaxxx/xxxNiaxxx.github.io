import { route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { deleteConversation, getConversation } from "@/lib/ai/chat";

type P = { id: string };

export const GET = route<P>(async (_req, { id }) => getConversation(await requireOrganizationMember(), id));

export const DELETE = route<P>(async (_req, { id }) => {
  await deleteConversation(await requireOrganizationMember(), id);
  return { deleted: true };
});
