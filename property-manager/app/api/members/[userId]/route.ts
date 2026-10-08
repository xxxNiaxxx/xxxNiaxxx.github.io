import { readJson, route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { removeMember, updateMemberRole } from "@/lib/services/members";

type P = { userId: string };

/** { role: "ADMIN" | "MEMBER" } — owner only. */
export const PATCH = route<P>(async (req, { userId }) => updateMemberRole(await requireOrganizationMember(), userId, await readJson(req)));

/** Remove a member, or leave the team when userId is yourself. */
export const DELETE = route<P>(async (_req, { userId }) => {
  await removeMember(await requireOrganizationMember(), userId);
  return { removed: true };
});
