import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { dateToISO, zonedDateTime, zonedISODate } from "@/lib/dates";
import { db } from "@/lib/db";
import { reportError } from "@/lib/monitoring/errors";
import type { OrgContext } from "@/lib/permissions";
import { FREE_UNTIL, freeUntilOf, stripeForReferrals } from "./billing";

/*
 * «Φέρτε έναν φίλο»: each organization has a link (/waitlist?ref=CODE). When an
 * organization that signed up through it adds its first property, both get
 * REFERRAL_MONTHS more free months, added after the end of their free use
 * (1 January 2027, or later if they already have extra months). The one who
 * shares the link earns at most MAX_REFERRAL_MONTHS this way.
 */

export const REFERRAL_MONTHS = 3;
export const MAX_REFERRAL_MONTHS = 12;

// No 0/O, 1/I/L: the code is read aloud and typed by hand.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const newCode = () => Array.from(randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join("");

/** A code as typed in a link: upper case, only the code's characters, or null. */
export function normalizeReferralCode(v: unknown) {
  if (typeof v !== "string") return null;
  const code = v.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return code.length >= 6 && code.length <= 16 ? code : null;
}

const SELECT = { referralCode: true, referralMonths: true, freeUntil: true, referredById: true, referralRewardedAt: true, isDemo: true } as const;

/** Same day `months` later on the Athens calendar (free use always ends at midnight in Greece). */
const addMonths = (d: Date, months: number) => {
  const [y, m, day] = zonedISODate(d).split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + months, day));
  return zonedDateTime(dateToISO(t));
};

/** The organization's link and what it has earned (billing page). */
export async function referralState(ctx: OrgContext, origin: string) {
  let org = await db.organization.findUniqueOrThrow({ where: { id: ctx.organizationId }, select: SELECT });
  if (!org.referralCode && !org.isDemo) {
    // A new code; on the rare clash with another organization's code, try again.
    for (let i = 0; i < 5 && !org.referralCode; i++) {
      try {
        org = await db.organization.update({ where: { id: ctx.organizationId }, data: { referralCode: newCode() }, select: SELECT });
      } catch (e) {
        if ((e as { code?: string }).code !== "P2002") throw e;
      }
    }
  }
  const [joined, rewarded] = await Promise.all([
    db.organization.count({ where: { referredById: ctx.organizationId } }),
    db.organization.count({ where: { referredById: ctx.organizationId, referralRewardedAt: { not: null } } }),
  ]);
  return {
    url: org.referralCode ? `${origin}/waitlist?ref=${org.referralCode}` : null,
    code: org.referralCode,
    months: REFERRAL_MONTHS,
    maxMonths: MAX_REFERRAL_MONTHS,
    earnedMonths: org.referralMonths,
    freeUntil: athensDay(new Date(freeUntilOf(org).getTime() - 1)),
    /** Friends who signed up, and those who added a property (both got the months). */
    joined,
    rewarded,
    /** This organization came through a friend's link and gets its months with its first property. */
    pendingOwnReward: !!org.referredById && !org.referralRewardedAt,
  };
}
const athensDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Athens" }).format(d);

/** On sign-up: remembers whose link brought the new organization (an unknown code is ignored). */
export async function linkReferral(tx: Prisma.TransactionClient, organizationId: string, code: string | null | undefined) {
  const ref = normalizeReferralCode(code);
  if (!ref) return;
  const referrer = await tx.organization.findUnique({ where: { referralCode: ref }, select: { id: true, isDemo: true } });
  if (!referrer || referrer.isDemo || referrer.id === organizationId) return;
  await tx.organization.update({ where: { id: organizationId }, data: { referredById: referrer.id } });
}

/** Free months for one side; Stripe's next charge moves with them when there is a subscription. */
async function grant(tx: Prisma.TransactionClient, organizationId: string, now: Date, capped: boolean) {
  const org = await tx.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { referralMonths: true, freeUntil: true, stripeSubscriptionId: true, billingExempt: true } });
  const months = capped ? Math.min(REFERRAL_MONTHS, MAX_REFERRAL_MONTHS - org.referralMonths) : REFERRAL_MONTHS;
  if (months <= 0) return null;
  const from = [FREE_UNTIL, org.freeUntil ?? FREE_UNTIL, now].reduce((a, b) => (b > a ? b : a));
  const freeUntil = addMonths(from, months);
  await tx.organization.update({ where: { id: organizationId }, data: { referralMonths: { increment: months }, freeUntil } });
  return org.stripeSubscriptionId && !org.billingExempt ? { subscription: org.stripeSubscriptionId, freeUntil } : null;
}

/**
 * Called when an organization adds a property: the first time, if it came
 * through a friend's link, both organizations get their free months. Never
 * fails the caller: it is a bonus.
 */
export async function rewardReferral(organizationId: string, now = new Date()) {
  try {
    const stripeUpdates = await db.$transaction(async (tx) => {
      // Only once: whoever sets referralRewardedAt first gives the months.
      const claimed = await tx.organization.updateMany({
        where: { id: organizationId, referredById: { not: null }, referralRewardedAt: null },
        data: { referralRewardedAt: now },
      });
      if (!claimed.count) return [];
      const org = await tx.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { referredById: true } });
      return [await grant(tx, organizationId, now, false), await grant(tx, org.referredById!, now, true)];
    });
    for (const u of stripeUpdates) {
      // The subscription's first (or next) charge moves to the new end of the free use.
      if (u) await stripeForReferrals().subscriptions.update(u.subscription, { trial_end: Math.floor(u.freeUntil.getTime() / 1000), proration_behavior: "none" });
    }
  } catch (error) {
    await reportError(error, { source: "api", path: `referral reward ${organizationId}` });
  }
}
export type ReferralState = Awaited<ReturnType<typeof referralState>>;
