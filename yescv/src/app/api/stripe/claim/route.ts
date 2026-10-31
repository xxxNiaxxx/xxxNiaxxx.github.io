import { z } from "zod";
import { AppError } from "@/lib/errors";
import { createEntitlementToken } from "@/lib/entitlements";
import { clientIp, handleError, hashKey, json, readJson } from "@/lib/http";
import { consumeExport } from "@/lib/ratelimit";
import { checkoutReady, getPurchase } from "@/lib/stripe";

export const runtime = "nodejs";

const schema = z.object({ sessionId: z.string().regex(/^cs_(test|live)_[A-Za-z0-9]{10,200}$/) });

/**
 * Exchanges a Checkout Session id for an entitlement token, but only when the
 * signature-verified webhook has already recorded that session as paid. The
 * success redirect itself proves nothing; "purchase_pending" tells the browser
 * to retry while the webhook is on its way.
 */
export async function POST(request: Request) {
  try {
    if (!checkoutReady()) throw new AppError("checkout_unavailable");
    const { sessionId } = await readJson(request, schema, 1_000);
    await consumeExport(hashKey(clientIp(request)));
    const purchase = await getPurchase(sessionId);
    if (!purchase) throw new AppError("purchase_pending");
    if (purchase.status !== "paid") throw new AppError("purchase_revoked");
    return json({ theme: purchase.theme, token: createEntitlementToken(purchase.theme, sessionId) });
  } catch (error) {
    return handleError("claim", error);
  }
}
