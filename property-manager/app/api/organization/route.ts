import { readJson, route } from "@/lib/api";
import { requireOrganization, requireOrganizationMember } from "@/lib/auth";
import { updateOrganization } from "@/lib/services/settings";

export const GET = route(async () => {
  const { organization, membership } = await requireOrganization();
  return { ...organization, role: membership.role };
});

export const PATCH = route(async (req) => updateOrganization(await requireOrganizationMember(), await readJson(req)));
