import { route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { revokeInvitation } from "@/lib/services/invitations";

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  await revokeInvitation(await requireOrganizationMember(), id);
  return { revoked: true };
});
