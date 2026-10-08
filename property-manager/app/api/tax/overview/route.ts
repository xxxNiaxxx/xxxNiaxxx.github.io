import { route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { getTaxOverview } from "@/lib/services/tax";

export const GET = route(async () => getTaxOverview(await requireOrganizationMember()));
