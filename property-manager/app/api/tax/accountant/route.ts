import { z } from "zod";
import type { NextRequest } from "next/server";
import { route, searchParamsObject } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { accountantWorkbook } from "@/lib/services/accountant";
import { recordExport } from "@/lib/services/security";

const query = z.object({ year: z.coerce.number().int().min(2018).max(2100) });

/** Excel for the accountant: GET /api/tax/accountant?year=2026 */
export const GET = route(async (req: NextRequest) => {
  // Holds guests' names and ID numbers: owners and administrators only, and logged.
  const ctx = await requireRole("ADMIN");
  const { year } = query.parse(searchParamsObject(req));
  const body = await accountantWorkbook(ctx, year);
  await recordExport(ctx, "accountant", { year });
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="logistis-${year}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
});
