import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as exportPdf } from "@/app/api/export/pdf/route";
import { POST as checkout } from "@/app/api/stripe/checkout/route";
import { POST as claim } from "@/app/api/stripe/claim/route";
import { POST as webhook } from "@/app/api/stripe/webhook/route";
import { createEntitlementToken, verifyEntitlementToken } from "@/lib/entitlements";
import { resetMemoryKv } from "@/lib/kv";
import { checkoutBlockers } from "@/lib/stripe";
import { greekCv, jsonRequest } from "./helpers";

const WEBHOOK_SECRET = "whsec_test_secret";
const stripe = new Stripe("sk_test_dummy");
let counter = 0;

function sessionEvent(type: string, session: Partial<Stripe.Checkout.Session>, id = `evt_${++counter}`) {
  return {
    id, object: "event", type, livemode: false, api_version: "2025-08-27", created: 1, pending_webhooks: 1, request: null,
    data: { object: { id: "cs_test_abcdefghijklmnop", object: "checkout.session", payment_status: "paid", livemode: false, metadata: { theme: "executive" }, payment_intent: "pi_123", ...session } },
  };
}

function signed(event: unknown, secret = WEBHOOK_SECRET): Request {
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://localhost/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": signature }, body: payload });
}

async function outcome(response: Response) {
  return ((await response.json()) as { outcome?: string }).outcome;
}

beforeEach(() => {
  resetMemoryKv();
  vi.stubEnv("PREMIUM_THEMES_ENABLED", "true");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET);
  vi.stubEnv("STRIPE_PRICE_EXECUTIVE", "price_exec123");
  vi.stubEnv("STRIPE_PRICE_CREATIVE", "price_crea123");
  vi.stubEnv("ENTITLEMENT_SECRET", "e".repeat(48));
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("configuration gate", () => {
  it("is ready only when everything is set", () => {
    expect(checkoutBlockers()).toEqual([]);
  });
  it("refuses live keys without explicit owner approval", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_dummy");
    expect(checkoutBlockers()).toContain("live Stripe key used without STRIPE_LIVE_MODE_APPROVED=true");
  });
  it("requires a durable store on Vercel", () => {
    vi.stubEnv("VERCEL", "1");
    expect(checkoutBlockers().join()).toContain("Upstash");
  });
  it("lists everything missing when nothing is set", () => {
    for (const name of ["PREMIUM_THEMES_ENABLED", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_EXECUTIVE", "STRIPE_PRICE_CREATIVE", "ENTITLEMENT_SECRET"]) vi.stubEnv(name, "");
    expect(checkoutBlockers()).toHaveLength(6);
  });
});

describe("POST /api/stripe/checkout", () => {
  it("is unavailable when premium themes are switched off", async () => {
    vi.stubEnv("PREMIUM_THEMES_ENABLED", "false");
    expect((await checkout(jsonRequest("/api/stripe/checkout", { theme: "executive" }))).status).toBe(503);
  });
  it("rejects unknown and free themes", async () => {
    expect((await checkout(jsonRequest("/api/stripe/checkout", { theme: "neon" }))).status).toBe(400);
    expect((await checkout(jsonRequest("/api/stripe/checkout", { theme: "classic" }))).status).toBe(400);
  });
});

describe("POST /api/stripe/webhook", () => {
  it("rejects a missing or invalid signature", async () => {
    const event = sessionEvent("checkout.session.completed", {});
    expect((await webhook(new Request("http://localhost/x", { method: "POST", body: JSON.stringify(event) }))).status).toBe(400);
    expect((await webhook(signed(event, "whsec_wrong"))).status).toBe(400);
  });
  it("rejects a tampered body", async () => {
    const event = sessionEvent("checkout.session.completed", {});
    const request = signed(event);
    const tampered = new Request(request.url, { method: "POST", headers: request.headers, body: JSON.stringify({ ...event, id: "evt_other" }) });
    expect((await webhook(tampered)).status).toBe(400);
  });
  it("records a paid session once and ignores the duplicate delivery", async () => {
    const event = sessionEvent("checkout.session.completed", {});
    expect(await outcome(await webhook(signed(event)))).toBe("recorded");
    expect(await outcome(await webhook(signed(event)))).toBe("duplicate");
  });
  it("ignores unknown themes", async () => {
    expect(await outcome(await webhook(signed(sessionEvent("checkout.session.completed", { metadata: { theme: "neon" } }))))).toBe("unknown_theme");
  });
  it("does not unlock unpaid, expired or failed sessions", async () => {
    expect(await outcome(await webhook(signed(sessionEvent("checkout.session.completed", { payment_status: "unpaid" }))))).toBe("unpaid");
    expect(await outcome(await webhook(signed(sessionEvent("checkout.session.expired", { payment_status: "unpaid" }))))).toBe("ignored");
    expect(await outcome(await webhook(signed(sessionEvent("checkout.session.async_payment_failed", { payment_status: "unpaid" }))))).toBe("ignored");
    expect((await claim(jsonRequest("/api/stripe/claim", { sessionId: "cs_test_abcdefghijklmnop" }))).status).toBe(404);
  });
});

describe("claim, export and refund", () => {
  const exportBody = { document: "cv", theme: "executive", language: "el", cv: greekCv, coverLetter: "Αξιότιμη κυρία, κύριε, σας γράφω." };

  it("only issues a token after the webhook recorded payment; refunds lock it again", async () => {
    const sessionId = "cs_test_abcdefghijklmnop";
    expect(await (await claim(jsonRequest("/api/stripe/claim", { sessionId }))).json()).toEqual({ error: "purchase_pending" });

    await webhook(signed(sessionEvent("checkout.session.completed", {})));
    const claimed = await (await claim(jsonRequest("/api/stripe/claim", { sessionId }))).json();
    expect(claimed.theme).toBe("executive");

    expect((await exportPdf(jsonRequest("/api/export/pdf", { ...exportBody, entitlement: claimed.token }))).status).toBe(200);
    // A token for one premium theme does not unlock the other.
    expect((await exportPdf(jsonRequest("/api/export/pdf", { ...exportBody, theme: "creative", entitlement: claimed.token }))).status).toBe(403);

    const refund = { id: `evt_${++counter}`, object: "event", type: "charge.refunded", livemode: false, api_version: "2025-08-27", created: 1, pending_webhooks: 1, request: null,
      data: { object: { id: "ch_1", object: "charge", refunded: true, payment_intent: "pi_123" } } };
    expect(await outcome(await webhook(signed(refund)))).toBe("refunded");
    expect((await exportPdf(jsonRequest("/api/export/pdf", { ...exportBody, entitlement: claimed.token }))).status).toBe(403);
    expect((await claim(jsonRequest("/api/stripe/claim", { sessionId }))).status).toBe(410);
  });

  it("rejects malformed session ids (no unlocking from a query parameter)", async () => {
    expect((await claim(jsonRequest("/api/stripe/claim", { sessionId: "success" }))).status).toBe(400);
  });
});

describe("entitlement tokens", () => {
  it("verify only with the right secret and before expiry", () => {
    const token = createEntitlementToken("creative", "cs_test_1", Date.UTC(2026, 0, 1));
    expect(verifyEntitlementToken(token, Date.UTC(2026, 0, 2))?.theme).toBe("creative");
    expect(verifyEntitlementToken(token, Date.UTC(2028, 0, 1))).toBeNull();
    vi.stubEnv("ENTITLEMENT_SECRET", "f".repeat(48));
    expect(verifyEntitlementToken(token, Date.UTC(2026, 0, 2))).toBeNull();
  });
});
