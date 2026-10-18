import { z } from "zod";
import { route, searchParamsObject } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { recordExport } from "@/lib/services/security";
import { exportAnnualCsv, exportStaysCsv } from "@/lib/services/tax";
import type { NextRequest } from "next/server";

const query = z.object({ type: z.enum(["stays", "annual"]), year: z.coerce.number().int().min(2018).max(2100) });

/** CSV for the accountant: GET /api/tax/export?type=stays|annual&year=2026 */
export const GET = route(async (req: NextRequest) => {
  // Holds guests' names: owners and administrators only, and logged.
  const ctx = await requireRole("ADMIN");
  const { type, year } = query.parse(searchParamsObject(req));
  const body = type === "stays" ? await exportStaysCsv(ctx, year) : await exportAnnualCsv(ctx, year);
  await recordExport(ctx, type === "stays" ? "tax-stays" : "tax-annual", { year });
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-${year}.csv"`,
    },
  });
});
