import { route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { rotateExportToken } from "@/lib/services/calendar-feeds";

/** Creates (or replaces) the secret iCal export link of the property. */
export const POST = route<{ id: string }>(async (_req, { id }) => rotateExportToken(await requireOrganizationMember(), id));
