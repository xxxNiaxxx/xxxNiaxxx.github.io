import { readJson, route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { importReservations } from "@/lib/services/reservation-import";

/** { source, amountMode, rows } — rows already parsed in the browser (see lib/import/parse.ts). */
export const POST = route(async (req) => importReservations(await requireOrganizationMember(), await readJson(req)));
