import Stripe from "stripe";
import { db } from "@/lib/db";
import { isPlatformAdmin, sendEmail } from "@/lib/email";
import { AppError } from "@/lib/errors";
import { hasRole, type OrgContext } from "@/lib/permissions";

/**
 * Subscriptions: a monthly price per active property, paid by card through
 * Stripe Checkout; cards, invoices and cancellation in the Stripe customer
 * portal. Everyone uses the app free until the end of 2026; subscribing
 * earlier starts the first charge on 1 January 2027.
 *
 * Environment: STRIPE_SECRET_KEY, STRIPE_PRICE_ID (monthly, per unit),
 * STRIPE_WEBHOOK_SECRET; NEXT_PUBLIC_PRICE_PER_PROPERTY is the price shown.
 */
export const FREE_UNTIL = new Date("2027-01-01T00:00:00+02:00");
export const PRICE_PER_PROPERTY = Number(process.env.NEXT_PUBLIC_PRICE_PER_PROPERTY || 12);
/** Statuses that keep access: past_due while Stripe retries the card. */
const PAID_STATUSES = new Set(["active", "trialing", "past_due"]);

export const billingConfigured = () => !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PRICE_ID;

let stripeOverride: Stripe | null = null;
let stripeClient: Stripe | null = null;
/** Tests use a fake client. */
export function setStripeForTests(client: unknown) {
  stripeOverride = client as Stripe | null;
}
function stripe() {
  if (stripeOverride) return stripeOverride;
  if (!process.env.STRIPE_SECRET_KEY) throw new AppError("BAD_REQUEST", "Οι πληρωμές δεν έχουν ρυθμιστεί ακόμη.");
  stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

type BillingOrg = {
  id: string;
  billingExempt: boolean;
  subscriptionStatus: string | null;
  currentPeriodEnd: Date | null;
};

/** Organizations owned by one of the app's administrators never pay. */
async function ownedByPlatformAdmin(organizationId: string) {
  const owners = await db.organizationMember.findMany({ where: { organizationId, role: "OWNER" }, select: { user: { select: { email: true } } } });
  return owners.some((o) => isPlatformAdmin(o.user.email));
}

/** Can the organization use the app right now? */
export async function hasAccess(org: BillingOrg, now = new Date()) {
  if (now < FREE_UNTIL || org.billingExempt) return true;
  if (org.subscriptionStatus && PAID_STATUSES.has(org.subscriptionStatus)) return true;
  // Cancelled: paid until the end of the period.
  if (org.currentPeriodEnd && org.currentPeriodEnd > now) return true;
  return ownedByPlatformAdmin(org.id);
}

/** For requireOrganizationMember: a clear message instead of the app when the free period is over and nothing is paid. */
export async function assertAccess(organizationId: string, now = new Date()) {
  if (now < FREE_UNTIL) return;
  const org = await db.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { id: true, billingExempt: true, subscriptionStatus: true, currentPeriodEnd: true } });
  if (!(await hasAccess(org, now))) {
    throw new AppError("PAYMENT_REQUIRED", "Η δωρεάν περίοδος έληξε. Ο ιδιοκτήτης του λογαριασμού μπορεί να ενεργοποιήσει τη συνδρομή από την ιστοσελίδα.");
  }
}

const activeProperties = (organizationId: string) => db.property.count({ where: { organizationId, status: "ACTIVE" } });

/** What the billing page shows. */
export async function billingState(ctx: OrgContext, now = new Date()) {
  const org = await db.organization.findUniqueOrThrow({ where: { id: ctx.organizationId } });
  const [properties, adminOwned] = await Promise.all([activeProperties(org.id), ownedByPlatformAdmin(org.id)]);
  const paid = !!org.subscriptionStatus && PAID_STATUSES.has(org.subscriptionStatus);
  return {
    configured: billingConfigured(),
    canManage: hasRole(ctx, "ADMIN"),
    exempt: org.billingExempt || adminOwned,
    freePeriod: now < FREE_UNTIL,
    freeUntil: "2026-12-31",
    hasAccess: await hasAccess(org, now),
    subscribed: paid,
    status: org.subscriptionStatus,
    quantity: org.subscriptionQuantity,
    currentPeriodEnd: org.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: org.cancelAtPeriodEnd,
    hasCustomer: !!org.stripeCustomerId,
    activeProperties: properties,
    pricePerProperty: PRICE_PER_PROPERTY,
    monthlyTotal: Math.max(1, properties) * PRICE_PER_PROPERTY,
  };
}
export type BillingState = Awaited<ReturnType<typeof billingState>>;

function requireManager(ctx: OrgContext) {
  if (!hasRole(ctx, "ADMIN")) throw new AppError("FORBIDDEN", "Τη συνδρομή τη διαχειρίζονται ο ιδιοκτήτης και οι διαχειριστές");
}

/** Stripe Checkout for a new subscription: one unit per active property (at least one). */
export async function startCheckout(ctx: OrgContext, user: { email: string; name?: string | null }, origin: string, now = new Date()) {
  requireManager(ctx);
  if (!billingConfigured() && !stripeOverride) throw new AppError("BAD_REQUEST", "Οι πληρωμές δεν έχουν ρυθμιστεί ακόμη.");
  const org = await db.organization.findUniqueOrThrow({ where: { id: ctx.organizationId } });
  if (org.subscriptionStatus && PAID_STATUSES.has(org.subscriptionStatus)) throw new AppError("CONFLICT", "Υπάρχει ήδη ενεργή συνδρομή.");
  let customer = org.stripeCustomerId;
  if (!customer) {
    customer = (await stripe().customers.create({ email: user.email, name: org.name, metadata: { organizationId: org.id } })).id;
    await db.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customer } });
  }
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: org.id,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: Math.max(1, await activeProperties(org.id)) }],
    subscription_data: {
      metadata: { organizationId: org.id },
      // During the free period the first charge is on 1 January (Stripe needs a trial end at least 48 hours ahead;
      // in the last two days of December the subscription simply starts now).
      ...(FREE_UNTIL.getTime() - now.getTime() > 50 * 3_600_000 ? { trial_end: Math.floor(FREE_UNTIL.getTime() / 1000) } : {}),
    },
    customer_update: { name: "auto", address: "auto" },
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    allow_promotion_codes: true,
    locale: "el",
    success_url: `${origin}/billing?done=1`,
    cancel_url: `${origin}/billing`,
  });
  if (!session.url) throw new Error("Stripe returned no checkout URL");
  return { url: session.url };
}

/** Stripe's customer portal: card, invoices, cancellation. */
export async function openPortal(ctx: OrgContext, origin: string) {
  requireManager(ctx);
  const org = await db.organization.findUniqueOrThrow({ where: { id: ctx.organizationId } });
  if (!org.stripeCustomerId) throw new AppError("BAD_REQUEST", "Δεν υπάρχει συνδρομή ακόμη.");
  const session = await stripe().billingPortal.sessions.create({ customer: org.stripeCustomerId, return_url: `${origin}/billing`, locale: "el" });
  return { url: session.url };
}

// ─── Webhook ─────────────────────────────────────────────────────────

/** Verifies the signature of a webhook request (STRIPE_WEBHOOK_SECRET). */
export function verifyWebhook(payload: string, signature: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signature) throw new AppError("BAD_REQUEST", "Missing signature");
  try {
    return stripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    throw new AppError("BAD_REQUEST", "Invalid signature");
  }
}

function periodEnd(sub: Stripe.Subscription) {
  // Newer API versions keep the period on the items.
  const end = sub.items?.data?.[0]?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  return end ? new Date(end * 1000) : null;
}

async function saveSubscription(sub: Stripe.Subscription) {
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const org =
    (await db.organization.findFirst({ where: { OR: [{ stripeSubscriptionId: sub.id }, { stripeCustomerId: customer }] } })) ??
    (sub.metadata?.organizationId ? await db.organization.findUnique({ where: { id: sub.metadata.organizationId } }) : null);
  if (!org) return null;
  await db.organization.update({
    where: { id: org.id },
    data: {
      stripeCustomerId: customer,
      stripeSubscriptionId: sub.id,
      subscriptionStatus: sub.status,
      subscriptionQuantity: sub.items?.data?.[0]?.quantity ?? null,
      currentPeriodEnd: periodEnd(sub),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });
  return org.id;
}

/** Applies a Stripe event to the organization it belongs to. */
export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      if (s.mode !== "subscription" || !s.subscription) return { handled: false };
      const sub = typeof s.subscription === "string" ? await stripe().subscriptions.retrieve(s.subscription) : s.subscription;
      if (s.client_reference_id && typeof s.customer === "string") {
        await db.organization.updateMany({ where: { id: s.client_reference_id, stripeCustomerId: null }, data: { stripeCustomerId: s.customer } });
      }
      return { handled: true, organizationId: await saveSubscription(sub) };
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return { handled: true, organizationId: await saveSubscription(event.data.object) };
    default:
      return { handled: false };
  }
}

// ─── Daily jobs ──────────────────────────────────────────────────────

/** Keeps the paid quantity equal to the active properties; the change applies from the next invoice. */
export async function syncSubscriptionQuantities() {
  if (!billingConfigured() && !stripeOverride) return { skipped: true };
  const orgs = await db.organization.findMany({ where: { stripeSubscriptionId: { not: null }, subscriptionStatus: { in: [...PAID_STATUSES] } } });
  let updated = 0;
  for (const org of orgs) {
    const quantity = Math.max(1, await activeProperties(org.id));
    if (quantity === org.subscriptionQuantity) continue;
    const sub = await stripe().subscriptions.retrieve(org.stripeSubscriptionId!);
    const item = sub.items.data[0];
    if (!item) continue;
    await stripe().subscriptions.update(sub.id, { items: [{ id: item.id, quantity }], proration_behavior: "none" });
    await db.organization.update({ where: { id: org.id }, data: { subscriptionQuantity: quantity } });
    updated++;
  }
  return { updated };
}

/** Days in December 2026 when owners without a subscription are reminded (the terms promise 30 days' notice). */
const REMINDER_DAYS = ["2026-12-01", "2026-12-24"];

/** "The free period ends on 31 December": to owners and administrators of organizations that have not subscribed. */
export async function sendFreePeriodReminders(origin: string, now = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Athens" }).format(now);
  const key = [...REMINDER_DAYS].reverse().find((d) => d <= today);
  if (!key || now >= FREE_UNTIL) return { sent: 0 };
  const orgs = await db.organization.findMany({
    where: {
      billingExempt: false,
      AND: [
        { OR: [{ billingReminderSent: null }, { billingReminderSent: { lt: key } }] },
        // NOT IN alone would also skip organizations with no status (SQL NULL).
        { OR: [{ subscriptionStatus: null }, { subscriptionStatus: { notIn: [...PAID_STATUSES] } }] },
      ],
    },
    include: { members: { where: { role: { in: ["OWNER", "ADMIN"] } }, include: { user: { select: { email: true } } } } },
  });
  let sent = 0;
  for (const org of orgs) {
    const emails = org.members.map((m) => m.user.email);
    if (emails.some((e) => isPlatformAdmin(e)) || !emails.length) continue;
    const properties = Math.max(1, await activeProperties(org.id));
    await sendEmail({
      to: emails,
      subject: "Η δωρεάν περίοδος λήγει στις 31 Δεκεμβρίου",
      text:
        `Η εφαρμογή είναι δωρεάν για το «${org.name}» μέχρι τις 31 Δεκεμβρίου 2026.\n\n` +
        `Από 1 Ιανουαρίου 2027 η συνδρομή είναι ${PRICE_PER_PROPERTY} € ανά κατάλυμα τον μήνα — για τα ${properties} ` +
        `${properties === 1 ? "κατάλυμά" : "καταλύματά"} σας ${properties * PRICE_PER_PROPERTY} € τον μήνα. Δεν χρεώνεστε τίποτα αν δεν ` +
        "ενεργοποιήσετε συνδρομή· αν την ενεργοποιήσετε τώρα, η πρώτη χρέωση γίνεται 1 Ιανουαρίου.\n\n" +
        "Χωρίς συνδρομή, από 1 Ιανουαρίου βλέπετε μόνο τη σελίδα συνδρομής και μπορείτε να εξαγάγετε όλα τα δεδομένα σας.",
      action: { label: "Συνδρομή", url: `${origin}/billing` },
    });
    await db.organization.update({ where: { id: org.id }, data: { billingReminderSent: key } });
    sent++;
  }
  return { sent };
}

// ─── Administrators ──────────────────────────────────────────────────

/** All organizations with their subscription, for the app's administrators. */
export async function listOrganizationsForAdmin() {
  const orgs = await db.organization.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      members: { where: { role: "OWNER" }, select: { user: { select: { email: true } } } },
      _count: { select: { properties: { where: { status: "ACTIVE" } }, reservations: true } },
    },
  });
  return orgs.map((o) => ({
    id: o.id,
    name: o.name,
    owners: o.members.map((m) => m.user.email),
    createdAt: o.createdAt.toISOString(),
    activeProperties: o._count.properties,
    reservations: o._count.reservations,
    status: o.subscriptionStatus,
    quantity: o.subscriptionQuantity,
    billingExempt: o.billingExempt,
  }));
}
export type AdminOrganization = Awaited<ReturnType<typeof listOrganizationsForAdmin>>[number];

export async function setBillingExempt(organizationId: string, exempt: boolean) {
  await db.organization.update({ where: { id: organizationId }, data: { billingExempt: exempt } });
  return { billingExempt: exempt };
}
