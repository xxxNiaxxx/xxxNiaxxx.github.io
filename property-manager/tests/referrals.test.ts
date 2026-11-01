import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import type { OrgContext } from "@/lib/permissions";
import { registerAccount } from "@/lib/services/accounts";
import { hasAccess, nextBillingPeriod, setStripeForTests } from "@/lib/services/billing";
import { createProperty } from "@/lib/services/properties";
import { MAX_REFERRAL_MONTHS, normalizeReferralCode, referralState, rewardReferral } from "@/lib/services/referrals";
import { joinWaitlist, setRegistrationOpen } from "@/lib/services/waitlist";
import { createTenant, resetDatabase } from "./helpers";

const NOW = new Date("2026-11-15T10:00:00Z");
const APRIL = new Date("2027-04-01T00:00:00+03:00");
const property = { name: "Loft", city: "Αθήνα", country: "Ελλάδα", basePrice: 60, maxGuests: 2 };
let n = 0;
const newEmail = () => `friend${++n}@test.local`;

async function signUp(ref?: string) {
  const { organizationId, userId } = await registerAccount({ name: "Friend", email: newEmail(), password: "password123", organizationName: `Friend ${n}`, acceptTerms: true, ref });
  return { organizationId, userId, role: "OWNER" as const } satisfies OrgContext;
}

describe("«Φέρτε έναν φίλο»", () => {
  let host: OrgContext;
  let code: string;
  const updates: { id: string; args: { trial_end: number } }[] = [];

  beforeAll(async () => {
    await resetDatabase();
    await setRegistrationOpen(true);
    setStripeForTests({ subscriptions: { update: async (id: string, args: { trial_end: number }) => updates.push({ id, args }) } });
    host = await createTenant("Host");
    const state = await referralState(host, "https://app.test");
    code = state.code!;
  });
  afterAll(() => setStripeForTests(null));

  it("gives each organization a link with a short code", async () => {
    expect(code).toMatch(/^[2-9A-HJ-NP-Z]{8}$/);
    const again = await referralState(host, "https://app.test");
    expect(again).toMatchObject({ url: `https://app.test/waitlist?ref=${code}`, joined: 0, rewarded: 0, earnedMonths: 0, freeUntil: "2026-12-31" });
    expect(normalizeReferralCode(` ${code.toLowerCase()} `)).toBe(code);
    expect(normalizeReferralCode("x")).toBeNull();
  });

  it("gives both 3 months after 1/1/2027 when the friend adds the first property, once", async () => {
    const friend = await signUp(code.toLowerCase());
    expect((await db.organization.findUniqueOrThrow({ where: { id: friend.organizationId } })).referredById).toBe(host.organizationId);
    expect(await referralState(friend, "https://app.test")).toMatchObject({ pendingOwnReward: true });
    expect(await referralState(host, "https://app.test")).toMatchObject({ joined: 1, rewarded: 0 });

    await createProperty(friend, property);
    await createProperty(friend, { ...property, name: "Second" });
    await rewardReferral(friend.organizationId, NOW);
    for (const id of [host.organizationId, friend.organizationId]) {
      const org = await db.organization.findUniqueOrThrow({ where: { id } });
      expect(org).toMatchObject({ referralMonths: 3, freeUntil: APRIL });
      // Free until the end of March, the first charge on 1 April.
      expect(await hasAccess(org, new Date("2027-03-31T12:00:00Z"))).toBe(true);
      expect(await hasAccess(org, new Date("2027-04-01T12:00:00Z"))).toBe(false);
      expect(nextBillingPeriod(org, NOW).start).toEqual(APRIL);
    }
    expect(await referralState(host, "https://app.test")).toMatchObject({ joined: 1, rewarded: 1, earnedMonths: 3, freeUntil: "2027-03-31" });
  });

  it("adds up for the one who shares, up to 12 months, and moves a subscription's first charge", async () => {
    await db.organization.update({ where: { id: host.organizationId }, data: { stripeSubscriptionId: "sub_host" } });
    for (let i = 0; i < 4; i++) await createProperty(await signUp(code), property);
    const org = await db.organization.findUniqueOrThrow({ where: { id: host.organizationId } });
    expect(org.referralMonths).toBe(MAX_REFERRAL_MONTHS);
    expect(org.freeUntil).toEqual(new Date("2028-01-01T00:00:00+02:00"));
    expect(updates.at(-1)).toEqual({ id: "sub_host", args: { trial_end: Math.floor(org.freeUntil!.getTime() / 1000), proration_behavior: "none" } });
    expect(updates).toHaveLength(3); // the fourth friend brought no more months
    expect(await referralState(host, "https://app.test")).toMatchObject({ joined: 5, rewarded: 5 });
  });

  it("ignores unknown codes, and a friend's own code", async () => {
    const stranger = await signUp("NOPE2345");
    expect((await db.organization.findUniqueOrThrow({ where: { id: stranger.organizationId } })).referredById).toBeNull();
    await createProperty(stranger, property);
    expect((await db.organization.findUniqueOrThrow({ where: { id: stranger.organizationId } })).referralMonths).toBe(0);
  });

  it("keeps the code of the link through the waitlist", async () => {
    const email = `ana${Date.now()}@test.local`;
    await joinWaitlist({ name: "Ana", email, consent: true, referralCode: code.toLowerCase() }, "https://app.test", NOW);
    expect((await db.waitlistEntry.findUniqueOrThrow({ where: { email } })).referralCode).toBe(code);
  });
});
