import { readJson, route, searchParamsObject } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { markFiling, unmarkFiling } from "@/lib/services/tax";

/** Mark a periodic return (e.g. the monthly climate-fee return) as filed. */
export const POST = route(async (req) => markFiling(await requireOrganizationMember(), await readJson(req)));

/** Undo: DELETE /api/tax/filings?kind=CLIMATE_FEE&period=2026-09 */
export const DELETE = route(async (req) => unmarkFiling(await requireOrganizationMember(), searchParamsObject(req)));
