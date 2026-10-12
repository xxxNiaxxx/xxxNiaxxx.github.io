import { NextResponse, type NextRequest } from "next/server";
import { errorResponse } from "@/lib/api";
import { reportError } from "@/lib/monitoring/errors";
import { declarationsForKey } from "@/lib/services/autofill-keys";

/*
 * Read by the «Συμπλήρωση ΑΑΔΕ» bookmark from the AADE page (another site), so
 * it answers cross-origin. No cookies are involved: the bookmark sends its own
 * key in a header, which also keeps other sites from reading this with a
 * signed-in visitor's session.
 */
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "x-autofill-key",
  "access-control-max-age": "600",
  "cache-control": "no-store",
};

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  let res: NextResponse;
  try {
    res = NextResponse.json({ data: await declarationsForKey(req.headers.get("x-autofill-key")) });
  } catch (error) {
    res = errorResponse(error);
    if (res.status === 500) await reportError(error, { source: "api", path: "GET /api/aade/pending" });
  }
  for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
  return res;
}
