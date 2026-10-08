import { route, searchParamsObject } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { getCalendar } from "@/lib/services/calendar";

export const GET = route(async (req) => getCalendar(await requireOrganizationMember(), searchParamsObject(req)));
