import { AUTOFILL_SOURCE } from "@/lib/aade-autofill";

/**
 * The AADE form autofill script, for the mobile app's in-app browser. Served
 * rather than built into the app, so a change in the AADE form is fixed here
 * without a new app release. It holds no data: the app passes the values.
 */
export function GET() {
  return new Response(AUTOFILL_SOURCE, {
    headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=300" },
  });
}
