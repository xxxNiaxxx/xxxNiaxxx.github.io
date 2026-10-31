import { errorResponse, json, readLimited } from "@/lib/http";
import { logEvent } from "@/lib/log";
import { processEvent, stripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) return errorResponse("checkout_unavailable", 503);
  const signature = request.headers.get("stripe-signature");
  if (!signature) return errorResponse("invalid_input", 400);

  let rawBody: string;
  try {
    // The signature covers the exact bytes Stripe sent, so verify the raw text before parsing.
    rawBody = await readLimited(request, 512_000);
  } catch {
    return errorResponse("too_large", 413);
  }
  let event;
  try {
    event = stripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    logEvent("stripe_webhook_bad_signature");
    return errorResponse("invalid_input", 400);
  }
  try {
    const outcome = await processEvent(event);
    return json({ received: true, outcome });
  } catch {
    // 500 makes Stripe retry later; processEvent already released its idempotency claim.
    logEvent("stripe_webhook_failed", { type: event.type });
    return errorResponse("server_error", 500);
  }
}
