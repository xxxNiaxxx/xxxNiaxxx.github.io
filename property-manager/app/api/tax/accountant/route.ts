import { z } from "zod";
import type { NextRequest } from "next/server";
import { route, searchParamsObject } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { accountantWorkbook } from "@/lib/services/accountant";

const query = z.object({ year: z.coerce.number().int().min(2018).max(2100) });

/** Excel for the accountant: GET /api/tax/accountant?year=2026 */
export const GET = route(async (req: NextRequest) => {
  const ctx = await requireOrganizationMember();
  const { year } = query.parse(searchParamsObject(req));
  const body = await accountantWorkbook(ctx, year);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="logistis-${year}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
});
