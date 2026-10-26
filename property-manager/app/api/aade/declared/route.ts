import { NextResponse, type NextRequest } from "next/server";
import { errorResponse } from "@/lib/api";
import { reportError } from "@/lib/monitoring/errors";
import { markDeclaredForKey } from "@/lib/services/autofill-keys";

/*
 * Called by the extension on the AADE page when the host has submitted a
 * declaration, to mark the stay declared. Same key and cross-origin rules as
 * /api/aade/pending; no cookies are involved.
 */
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "x-autofill-key, content-type",
  "access-control-max-age": "600",
  "cache-control": "no-store",
};

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  let res: NextResponse;
  try {
    const body = await req.json().catch(() => ({}));
    res = NextResponse.json({ data: await markDeclaredForKey(req.headers.get("x-autofill-key"), body) });
  } catch (error) {
    res = errorResponse(error);
    if (res.status === 500) await reportError(error, { source: "api", path: "POST /api/aade/declared" });
  }
  for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
  return res;
}
