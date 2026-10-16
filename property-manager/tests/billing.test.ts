import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { type EmailMessage, setEmailSenderForTests } from "@/lib/email";
import { listErrors, reportError, setErrorResolved } from "@/lib/monitoring/errors";
import type { OrgContext } from "@/lib/permissions";
import {
  assertAccess,
  billingState,
  FREE_UNTIL,
  handleStripeEvent,
  hasAccess,
  sendFreePeriodReminders,
  setStripeForTests,
  startCheckout,
  propertyMonthlyPrice,
  syncSubscriptionQuantities,
} from "@/lib/services/billing";
import { exportOrganizationData } from "@/lib/services/data-export";
import { createGuest, createProperty, createReservationRow, createTenant, resetDatabase } from "./helpers";

const BEFORE = new Date("2026-11-15T10:00:00Z");
const AFTER = new Date("2027-01-02T10:00:00Z");

function fakeStripe() {
  const calls: Record<string, unknown[]> = { customers: [], sessions: [], updates: [] };
  const sub = (id: string, quantity: number, status = "active") => ({
    id,
    status,
    customer: "cus_1",
    cancel_at_period_end: false,
    metadata: {},
    items: { data: [{ id: "si_1", quantity, current_period_end: Math.floor(new Date("2027-02-01T00:00:00Z").getTime() / 1000) }] },
  });
  return {
    calls,
    sub,
    client: {
      customers: { create: async (args: unknown) => (calls.customers.push(args), { id: "cus_1" }) },
      checkout: { sessions: { create: async (args: unknown) => (calls.sessions.push(args), { url: "https://checkout.stripe.test/s" }) } },
      billingPortal: { sessions: { create: async () => ({ url: "https://portal.stripe.test" }) } },
      subscriptions: {
        retrieve: async (id: string) => sub(id, 1),
        update: async (id: string, args: unknown) => (calls.updates.push({ id, args }), sub(id, 2)),
      },
    },
  };
}

describe("subscriptions", () => {
  let owner: OrgContext;
  let sent: EmailMessage[];

  beforeAll(async () => {
    await resetDatabase();
    process.env.STRIPE_PRICE_ID = "price_test";
    process.env.STRIPE_ROOM_PRICE_ID = "price_room";
    owner = await createTenant("Paying");
    const flat = await createProperty(owner, { name: "A flat" });
    const rooms = await db.property.update({ where: { id: (await createProperty(owner, { name: "B rooms" })).id }, data: { rentalUnits: 12 } });
    await createProperty(owner, { name: "C empty" });
    const guest = await createGuest(owner);
    // January: both booked. February: only the flat. The cancelled stay does not count.
    await createReservationRow(owner, { propertyId: flat.id, guestId: guest.id, checkIn: "2027-01-10", checkOut: "2027-02-03" });
    await createReservationRow(owner, { propertyId: rooms.id, guestId: guest.id, checkIn: "2027-01-20", checkOut: "2027-01-22" });
    await createReservationRow(owner, { propertyId: rooms.id, guestId: guest.id, checkIn: "2027-02-05", checkOut: "2027-02-07", status: "CANCELLED" });
  });
  beforeEach(() => {
    sent = [];
    setEmailSenderForTests(async (m) => void sent.push(m));
  });
  afterAll(() => {
    setStripeForTests(null);
    setEmailSenderForTests(null);
    delete process.env.STRIPE_PRICE_ID;
    delete process.env.STRIPE_ROOM_PRICE_ID;
    delete process.env.ADMIN_EMAILS;
  });

  it("everyone has access until the end of 2026; afterwards only with a subscription", async () => {
    const org = { id: owner.organizationId, billingExempt: false, subscriptionStatus: null, currentPeriodEnd: null };
    expect(await hasAccess(org, BEFORE)).toBe(true);
    expect(await hasAccess(org, AFTER)).toBe(false);
    expect(await hasAccess({ ...org, billingExempt: true }, AFTER)).toBe(true);
    expect(await hasAccess({ ...org, subscriptionStatus: "past_due" }, AFTER)).toBe(true);
    expect(await hasAccess({ ...org, subscriptionStatus: "canceled", currentPeriodEnd: new Date("2027-01-20") }, AFTER)).toBe(true);
    await expect(assertAccess(owner.organizationId, AFTER)).rejects.toMatchObject({ code: "PAYMENT_REQUIRED" });
    await expect(assertAccess(owner.organizationId, BEFORE)).resolves.toBeUndefined();
  });

  it("organizations owned by the app's administrators never pay", async () => {
    const admin = await createTenant("Admin org");
    const email = (await db.user.findUniqueOrThrow({ where: { id: admin.userId } })).email;
    process.env.ADMIN_EMAILS = email;
    await expect(assertAccess(admin.organizationId, AFTER)).resolves.toBeUndefined();
    expect((await billingState(admin, AFTER)).exempt).toBe(true);
    delete process.env.ADMIN_EMAILS;
  });

  it("price: 12 € a property, +3 € for every extra room under the same registry number", () => {
    expect(propertyMonthlyPrice(1)).toBe(12);
    expect(propertyMonthlyPrice(12)).toBe(45);
  });

  it("the billing page shows the next charge from the stays already booked", async () => {
    const s = await billingState(owner, BEFORE);
    expect(s.nextPeriod).toEqual({ from: "2027-01-01", to: "2027-01-31" });
    expect(s.nextProperties.map((p) => [p.name, p.price])).toEqual([["A flat", 12], ["B rooms", 45]]);
    expect(s.nextTotal).toBe(57);
  });

  it("checkout: one unit per property with stays in the first month, plus the extra rooms; first charge on 1 January", async () => {
    const fake = fakeStripe();
    setStripeForTests(fake.client);
    const member = { ...owner, role: "MEMBER" as const };
    await expect(startCheckout(member, { email: "m@test.local" }, "https://app.test", BEFORE)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const r = await startCheckout(owner, { email: "o@test.local" }, "https://app.test", BEFORE);
    expect(r.url).toBe("https://checkout.stripe.test/s");
    const session = fake.calls.sessions[0] as { line_items: { price: string; quantity: number }[]; subscription_data: { trial_end?: number }; success_url: string; client_reference_id: string };
    expect(session.line_items).toEqual([{ price: "price_test", quantity: 2 }, { price: "price_room", quantity: 11 }]);
    expect(session.subscription_data.trial_end).toBe(Math.floor(FREE_UNTIL.getTime() / 1000));
    expect(session.client_reference_id).toBe(owner.organizationId);
    expect(session.success_url).toBe("https://app.test/billing?done=1");
    expect((await db.organization.findUniqueOrThrow({ where: { id: owner.organizationId } })).stripeCustomerId).toBe("cus_1");
    // Too close to 1 January for a trial: no trial end.
    await startCheckout(owner, { email: "o@test.local" }, "https://app.test", new Date("2026-12-30T12:00:00+02:00"));
    expect((fake.calls.sessions[1] as { subscription_data: { trial_end?: number } }).subscription_data.trial_end).toBeUndefined();
  });

  it("webhooks keep the organization's subscription up to date", async () => {
    const fake = fakeStripe();
    setStripeForTests(fake.client);
    await handleStripeEvent({ type: "customer.subscription.updated", data: { object: { ...fake.sub("sub_1", 2, "trialing"), metadata: { organizationId: owner.organizationId } } } } as never);
    let org = await db.organization.findUniqueOrThrow({ where: { id: owner.organizationId } });
    expect([org.stripeSubscriptionId, org.subscriptionStatus, org.subscriptionQuantity]).toEqual(["sub_1", "trialing", 2]);
    expect(org.currentPeriodEnd?.toISOString()).toBe("2027-02-01T00:00:00.000Z");
    await expect(assertAccess(owner.organizationId, AFTER)).resolves.toBeUndefined();

    await handleStripeEvent({ type: "customer.subscription.deleted", data: { object: { ...fake.sub("sub_1", 2, "canceled"), items: { data: [] } } } } as never);
    org = await db.organization.findUniqueOrThrow({ where: { id: owner.organizationId } });
    expect(org.subscriptionStatus).toBe("canceled");
    expect((await handleStripeEvent({ type: "invoice.created", data: { object: {} } } as never)).handled).toBe(false);
  });

  it("the daily job sizes the next charge from the stays of that month; a month without stays costs nothing", async () => {
    const updates: { id: string; args: { items: unknown[] } }[] = [];
    let items: { id: string; quantity: number; price: { id: string } }[] = [{ id: "si_1", quantity: 2, price: { id: "price_test" } }];
    setStripeForTests({
      subscriptions: {
        retrieve: async (id: string) => ({ id, items: { data: items } }),
        update: async (id: string, args: { items: { id?: string; price?: string; quantity?: number; deleted?: boolean }[] }) => {
          updates.push({ id, args });
          for (const it of args.items) {
            if (it.deleted) items = items.filter((i) => i.id !== it.id);
            else if (it.id) items = items.map((i) => (i.id === it.id ? { ...i, quantity: it.quantity! } : i));
            else items = [...items, { id: "si_room", quantity: it.quantity!, price: { id: it.price! } }];
          }
          return { id };
        },
      },
    });
    const setPeriodEnd = (iso: string) =>
      db.organization.update({ where: { id: owner.organizationId }, data: { stripeSubscriptionId: "sub_1", subscriptionStatus: "active", currentPeriodEnd: new Date(iso) } });

    // Next charge: January (both booked, 12 rooms → 11 extra).
    await setPeriodEnd("2027-01-01T00:00:00Z");
    expect(await syncSubscriptionQuantities(BEFORE)).toEqual({ updated: 1 });
    expect(updates[0].args).toEqual({ items: [{ price: "price_room", quantity: 11 }], proration_behavior: "none" });
    expect(await syncSubscriptionQuantities(BEFORE)).toEqual({ updated: 0 });

    // February: only the flat (the rooms' February stay is cancelled).
    await setPeriodEnd("2027-02-01T00:00:00Z");
    await syncSubscriptionQuantities(new Date("2027-01-15T10:00:00Z"));
    expect(updates[1].args.items).toEqual([{ id: "si_1", quantity: 1 }, { id: "si_room", deleted: true }]);

    // March: nothing booked, nothing to pay.
    await setPeriodEnd("2027-03-01T00:00:00Z");
    await syncSubscriptionQuantities(new Date("2027-02-15T10:00:00Z"));
    expect(updates[2].args.items).toEqual([{ id: "si_1", quantity: 0 }]);
    expect((await db.organization.findUniqueOrThrow({ where: { id: owner.organizationId } })).subscriptionQuantity).toBe(0);
  });

  it("owners without a subscription are told a month before the free period ends, once per reminder", async () => {
    const other = await createTenant("Not paying");
    await createProperty(other);
    expect((await sendFreePeriodReminders("https://app.test", new Date("2026-11-30T10:00:00Z"))).sent).toBe(0);
    const first = await sendFreePeriodReminders("https://app.test", new Date("2026-12-01T08:00:00Z"));
    expect(first.sent).toBeGreaterThanOrEqual(1);
    expect(sent.some((m) => m.subject.includes("31 Δεκεμβρίου") && m.text.includes("Not paying"))).toBe(true);
    // The subscribed organization is not reminded.
    expect(sent.some((m) => m.text.includes("«Paying»"))).toBe(false);
    expect((await sendFreePeriodReminders("https://app.test", new Date("2026-12-02T08:00:00Z"))).sent).toBe(0);
    expect((await sendFreePeriodReminders("https://app.test", new Date("2026-12-24T08:00:00Z"))).sent).toBeGreaterThanOrEqual(1);
  });

  it("the data export has everything but the secret links", async () => {
    const data = await exportOrganizationData(owner);
    expect(data.properties).toHaveLength(3);
    expect(data.properties[0]).not.toHaveProperty("icalToken");
    expect(data.organization).not.toHaveProperty("stripeCustomerId");
    await expect(exportOrganizationData({ ...owner, role: "MEMBER" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("error alerts", () => {
  it("groups errors and emails the administrators once, again when a resolved error returns", async () => {
    await db.errorEvent.deleteMany();
    const sent: EmailMessage[] = [];
    setEmailSenderForTests(async (m) => void sent.push(m));
    process.env.ADMIN_EMAILS = "ops@test.local";
    const t0 = new Date("2026-10-10T10:00:00Z");
    await reportError(new Error("Feed 123 failed for cuid c1234567890abcdefghijklmn"), { source: "api", path: "GET /api/x" }, t0);
    await reportError(new Error("Feed 456 failed for cuid c9999999990abcdefghijklmn"), { source: "api", path: "GET /api/x" }, new Date(t0.getTime() + 60_000));
    let errors = await listErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].count).toBe(2);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toEqual(["ops@test.local"]);

    // Still happening 7 hours later: another email.
    await reportError(new Error("Feed 789 failed for cuid c1111111110abcdefghijklmn"), { source: "api" }, new Date(t0.getTime() + 7 * 3_600_000));
    expect(sent).toHaveLength(2);

    await setErrorResolved(errors[0].id, true);
    await reportError(new Error("Feed 1 failed for cuid c2222222220abcdefghijklmn"), { source: "api" }, new Date(t0.getTime() + 7.5 * 3_600_000));
    expect(sent).toHaveLength(3);
    expect(sent[2].subject).toContain("(ξανά)");
    errors = await listErrors();
    expect(errors[0].resolved).toBe(false);

    await reportError(new Error("Something else"), { source: "cron" }, t0);
    expect(await listErrors()).toHaveLength(2);
    setEmailSenderForTests(null);
    delete process.env.ADMIN_EMAILS;
  });
});
