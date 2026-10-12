import { AUTOFILL_SOURCE } from "@/lib/aade-autofill";

/**
 * The AADE form autofill script, for the mobile app's in-app browser and the
 * browser bookmark. Served
 * rather than built into the app, so a change in the AADE form is fixed here
 * without a new app release. It holds no data: the app passes the values.
 */
// Always the script of the live deployment, never a copy kept by a cache.
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(AUTOFILL_SOURCE, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "no-store",
      // Fetched by the bookmark from the AADE page.
      "access-control-allow-origin": "*",
    },
  });
}
