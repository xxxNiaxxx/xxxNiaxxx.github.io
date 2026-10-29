import { z } from "zod";
import { AppError } from "@/lib/errors";
import { clientIp, handleError, hashKey, json, readJson } from "@/lib/http";
import { logEvent } from "@/lib/log";
import { consumeExport } from "@/lib/ratelimit";
import { checkoutReady, priceIdFor, stripeClient } from "@/lib/stripe";
import { premiumThemes } from "@/lib/themes";

export const runtime = "nodejs";

const schema = z.object({ theme: z.enum(premiumThemes) });

function appUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return (configured || new URL(request.url).origin).replace(/\/+$/, "");
}

export async function POST(request: Request) {
  try {
    if (!checkoutReady()) throw new AppError("checkout_unavailable");
    const { theme } = await readJson(request, schema, 1_000);
    await consumeExport(hashKey(clientIp(request))); // reuse the cheap per-IP counter against session spam
    const price = priceIdFor(theme);
    if (!price) throw new AppError("checkout_unavailable");
    const base = appUrl(request);
    // The price comes from server configuration only; the browser just names the theme.
    const session = await stripeClient().checkout.sessions.create({
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      success_url: `${base}/?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?purchase=cancelled`,
      metadata: { theme },
      payment_intent_data: { metadata: { theme } },
    });
    logEvent("checkout_created", { theme, livemode: session.livemode });
    return json({ url: session.url });
  } catch (error) {
    if (error instanceof AppError) return handleError("checkout", error);
    return handleError("checkout", new AppError("checkout_unavailable", "stripe_error"));
  }
}
