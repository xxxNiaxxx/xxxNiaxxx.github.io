import { createHmac, timingSafeEqual } from "node:crypto";
import { premiumThemes, type PremiumTheme } from "./themes";

/**
 * Premium-theme entitlement tokens.
 *
 * After the Stripe webhook has recorded a paid Checkout Session, the browser
 * exchanges the session id for this signed token (see /api/stripe/claim) and
 * keeps it in localStorage. Export routes verify the signature AND re-check the
 * purchase record, so a refunded purchase stops working. The token is only a
 * convenience copy of a server-side record; it is never trusted on its own.
 */
export type Entitlement = { theme: PremiumTheme; sessionId: string; exp: number };

const TTL_SECONDS = 400 * 86_400;

function secret(): string | undefined {
  const value = process.env.ENTITLEMENT_SECRET;
  return value && value.length >= 32 ? value : undefined;
}

export function hasEntitlementSecret(): boolean {
  return Boolean(secret());
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function createEntitlementToken(theme: PremiumTheme, sessionId: string, now = Date.now()): string {
  const key = secret();
  if (!key) throw new Error("ENTITLEMENT_SECRET is not set");
  const payload = Buffer.from(JSON.stringify({ theme, sessionId, exp: Math.floor(now / 1000) + TTL_SECONDS })).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

export function verifyEntitlementToken(token: string | undefined, now = Date.now()): Entitlement | null {
  const key = secret();
  if (!key || !token) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  const expected = Buffer.from(sign(payload, key));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<Entitlement>;
    if (!data.theme || !(premiumThemes as readonly string[]).includes(data.theme)) return null;
    if (typeof data.sessionId !== "string" || typeof data.exp !== "number" || data.exp * 1000 < now) return null;
    return data as Entitlement;
  } catch {
    return null;
  }
}
