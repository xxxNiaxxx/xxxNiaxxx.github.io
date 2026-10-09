import type { NextRequest } from "next/server";
import { route } from "@/lib/api";
import { handleStripeEvent, verifyWebhook } from "@/lib/services/billing";

/** Stripe webhook (checkout and subscription events), verified with STRIPE_WEBHOOK_SECRET. */
export const POST = route(async (req: NextRequest) => {
  const event = verifyWebhook(await req.text(), req.headers.get("stripe-signature"));
  return handleStripeEvent(event);
});
