import { json } from "@/lib/http";
import { checkoutReady } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** What the browser may show. Reveals only booleans, never which variable is missing. */
export function GET() {
  return json({ premiumCheckout: checkoutReady() });
}
