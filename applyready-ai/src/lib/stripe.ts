import Stripe from "stripe";
import { hasEntitlementSecret } from "./entitlements";
import { getKv, isDurable, isServerless } from "./kv";
import { logEvent } from "./log";
import { premiumThemes, type PremiumTheme } from "./themes";

/**
 * Premium themes are sold through Stripe Checkout. Everything here is off
 * unless the owner opts in, and live keys are refused unless the owner has
 * also set STRIPE_LIVE_MODE_APPROVED=true.
 */

export type PurchaseRecord = {
  theme: PremiumTheme;
  status: "paid" | "refunded";
  livemode: boolean;
  createdAt: string;
};

const PURCHASE_TTL = 3 * 365 * 86_400;
const EVENT_TTL = 35 * 86_400; // Stripe retries for up to 3 days; keep ids well beyond that.

export function priceIdFor(theme: PremiumTheme): string | undefined {
  const value = process.env[`STRIPE_PRICE_${theme.toUpperCase()}`]?.trim();
  return value && /^price_[A-Za-z0-9]+$/.test(value) ? value : undefined;
}

/** Every missing item that keeps checkout switched off, for the docs and /api/config. */
export function checkoutBlockers(): string[] {
  const missing: string[] = [];
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (process.env.PREMIUM_THEMES_ENABLED !== "true") missing.push("PREMIUM_THEMES_ENABLED=true");
  if (!key) missing.push("STRIPE_SECRET_KEY");
  else if (!/^(sk|rk)_test_/.test(key) && process.env.STRIPE_LIVE_MODE_APPROVED !== "true") {
    missing.push("live Stripe key used without STRIPE_LIVE_MODE_APPROVED=true");
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) missing.push("STRIPE_WEBHOOK_SECRET");
  for (const theme of premiumThemes) if (!priceIdFor(theme)) missing.push(`STRIPE_PRICE_${theme.toUpperCase()}`);
  if (!hasEntitlementSecret()) missing.push("ENTITLEMENT_SECRET (32+ characters)");
  if (isServerless() && !isDurable()) missing.push("Upstash Redis (UPSTASH_REDIS_REST_URL/TOKEN)");
  return missing;
}

export function checkoutReady(): boolean {
  return checkoutBlockers().length === 0;
}

export function stripeClient(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { maxNetworkRetries: 1, timeout: 15_000 });
}

export async function getPurchase(sessionId: string): Promise<PurchaseRecord | null> {
  const raw = await getKv().get(`stripe:purchase:${sessionId}`);
  return raw ? (JSON.parse(raw) as PurchaseRecord) : null;
}

function themeOf(session: Stripe.Checkout.Session): PremiumTheme | undefined {
  const theme = session.metadata?.theme;
  return (premiumThemes as readonly string[]).includes(theme ?? "") ? (theme as PremiumTheme) : undefined;
}

export type WebhookOutcome = "recorded" | "duplicate" | "ignored" | "unpaid" | "unknown_theme" | "refunded";

async function recordPaid(session: Stripe.Checkout.Session): Promise<WebhookOutcome> {
  if (session.payment_status !== "paid") return "unpaid"; // async methods: wait for async_payment_succeeded
  const theme = themeOf(session);
  if (!theme) return "unknown_theme";
  const kv = getKv();
  // Only what fulfilment needs: no email, name or card data is stored here.
  const record: PurchaseRecord = { theme, status: "paid", livemode: session.livemode, createdAt: new Date().toISOString() };
  await kv.set(`stripe:purchase:${session.id}`, JSON.stringify(record), PURCHASE_TTL);
  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (paymentIntent) await kv.set(`stripe:pi:${paymentIntent}`, session.id, PURCHASE_TTL);
  return "recorded";
}

async function recordRefund(charge: Stripe.Charge): Promise<WebhookOutcome> {
  if (!charge.refunded) return "ignored"; // partial refunds keep the theme
  const paymentIntent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntent) return "ignored";
  const kv = getKv();
  const sessionId = await kv.get(`stripe:pi:${paymentIntent}`);
  const purchase = sessionId ? await getPurchase(sessionId) : null;
  if (!sessionId || !purchase) return "ignored";
  await kv.set(`stripe:purchase:${sessionId}`, JSON.stringify({ ...purchase, status: "refunded" }), PURCHASE_TTL);
  return "refunded";
}

/**
 * Applies a verified webhook event exactly once. The event id is claimed
 * first; if processing then fails the claim is released so Stripe's retry can
 * run it again.
 */
export async function processEvent(event: Stripe.Event): Promise<WebhookOutcome> {
  const kv = getKv();
  const claimKey = `stripe:event:${event.id}`;
  if (!(await kv.setIfAbsent(claimKey, "1", EVENT_TTL))) return "duplicate";
  try {
    let outcome: WebhookOutcome = "ignored";
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        outcome = await recordPaid(event.data.object);
        break;
      case "charge.refunded":
        outcome = await recordRefund(event.data.object);
        break;
      // Expired and failed sessions never created a purchase, so there is nothing to undo.
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        outcome = "ignored";
        break;
    }
    logEvent("stripe_webhook", { type: event.type, outcome, livemode: event.livemode });
    return outcome;
  } catch (error) {
    await kv.del(claimKey);
    throw error;
  }
}
