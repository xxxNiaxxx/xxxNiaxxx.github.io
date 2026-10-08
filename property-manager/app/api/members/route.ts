import { route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { listMembers } from "@/lib/services/members";

export const GET = route(async () => listMembers(await requireOrganizationMember()));
