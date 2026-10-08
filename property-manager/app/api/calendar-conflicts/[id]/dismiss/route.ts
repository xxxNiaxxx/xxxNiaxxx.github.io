import { route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { dismissConflict } from "@/lib/services/calendar-conflicts";

/** Marks a possible double booking as checked (not a double booking). */
export const POST = route<{ id: string }>(async (_req, { id }) => dismissConflict(await requireOrganizationMember(), id));
