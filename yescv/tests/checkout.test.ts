import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jsonRequest } from "./helpers";

const create = vi.fn(async () => ({ url: "https://checkout.stripe.com/c/pay/cs_test_x", livemode: false }));
vi.mock("@/lib/stripe", async (original) => ({
  ...(await original<typeof import("@/lib/stripe")>()),
  stripeClient: () => ({ checkout: { sessions: { create } } }),
}));

const { POST: checkout } = await import("@/app/api/stripe/checkout/route");

beforeEach(() => {
  vi.stubEnv("PREMIUM_THEMES_ENABLED", "true");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_x");
  vi.stubEnv("STRIPE_PRICE_EXECUTIVE", "price_exec123");
  vi.stubEnv("STRIPE_PRICE_CREATIVE", "price_crea123");
  vi.stubEnv("ENTITLEMENT_SECRET", "e".repeat(48));
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com/");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/stripe/checkout", () => {
  it("creates a session with the server-side price, ignoring any client price", async () => {
    const response = await checkout(jsonRequest("/api/stripe/checkout", { theme: "executive", price: "price_attacker" }));
    expect(response.status).toBe(200);
    expect((await response.json()).url).toContain("checkout.stripe.com");
    const params = (create.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(params.mode).toBe("payment");
    expect(params.line_items).toEqual([{ price: "price_exec123", quantity: 1 }]);
    expect(params.metadata).toEqual({ theme: "executive" });
    expect(params.success_url).toBe("https://app.example.com/?purchase=success&session_id={CHECKOUT_SESSION_ID}");
    expect(params.cancel_url).toBe("https://app.example.com/?purchase=cancelled");
  });
});
