import { route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { getDashboard } from "@/lib/services/dashboard";

export const GET = route(async () => getDashboard(await requireOrganizationMember()));
