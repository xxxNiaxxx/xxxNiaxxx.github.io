import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { dateToISO, isoToDate, todayISO } from "@/lib/dates";
import type { OrgContext } from "@/lib/permissions";
import { LATE_STAY_DECLARATION_FINE, stayDeclarationDeadline } from "@/lib/tax/gr";
import { BOOKING_REQUEST_NOTE } from "./guest-pages";
import { getTaxContext } from "./tax";

/** Minutes of work each automated step saves (conservative estimates). */
const MINUTES = { declaration: 5, checkin: 5, reply: 4, calendarStay: 2, importedStay: 2 } as const;

/**
 * "What the app saved you this year": fines avoided, double bookings caught,
 * commission saved on direct bookings and hours of routine work. Every number
 * comes from the organization's own data; time is a conservative estimate.
 */
export async function savingsReport(ctx: OrgContext, now = new Date()) {
  const today = todayISO(now);
  const year = Number(today.slice(0, 4));
  const from = isoToDate(`${year}-01-01`);
  const to = isoToDate(`${year + 1}-01-01`);
  const org = ctx.organizationId;

  const [declared, conflicts, direct, checkins, calendarStays, importedStays, orgRow, tax] = await Promise.all([
    db.reservation.findMany({
      where: { organizationId: org, declarationStatus: "DECLARED", declaredAt: { gte: from, lt: to } },
      select: { checkOut: true, cancelledAt: true, status: true, declaredAt: true },
    }),
    db.calendarConflict.count({ where: { organizationId: org, detectedAt: { gte: from, lt: to }, dismissedAt: null } }),
    db.reservation.findMany({
      where: { organizationId: org, source: "DIRECT", status: { in: ["CONFIRMED", "COMPLETED"] }, notes: { startsWith: BOOKING_REQUEST_NOTE }, checkIn: { gte: from, lt: to } },
      select: { totalAmount: true },
    }),
    db.reservation.count({ where: { organizationId: org, checkinCompletedAt: { gte: from, lt: to } } }),
    db.reservation.count({ where: { organizationId: org, calendarFeedId: { not: null }, createdAt: { gte: from, lt: to } } }),
    db.reservation.count({ where: { organizationId: org, platformDetails: { not: Prisma.DbNull }, createdAt: { gte: from, lt: to } } }),
    db.organization.findUniqueOrThrow({ where: { id: org }, select: { aiRepliesDrafted: true } }),
    getTaxContext(ctx),
  ]);

  // Declared before the deadline: the fine for a late declaration was avoided.
  const onTime = declared.filter((r) => {
    const trigger = r.status === "CANCELLED" && r.cancelledAt ? dateToISO(r.cancelledAt) : dateToISO(r.checkOut);
    return r.declaredAt && dateToISO(r.declaredAt) <= stayDeclarationDeadline(trigger);
  }).length;

  // Direct bookings from the booking page pay no platform commission (at the usual Booking.com rate).
  const rate = (tax.commissionRates.BOOKING_COM ?? 15) / 100;
  const directRevenue = direct.reduce((a, r) => a + Number(r.totalAmount), 0);
  const commissionSaved = Math.round(directRevenue * rate);

  const minutes =
    declared.length * MINUTES.declaration +
    checkins * MINUTES.checkin +
    orgRow.aiRepliesDrafted * MINUTES.reply +
    calendarStays * MINUTES.calendarStay +
    importedStays * MINUTES.importedStay;

  return {
    year,
    declarationsOnTime: onTime,
    finesAvoided: onTime * LATE_STAY_DECLARATION_FINE,
    doubleBookingsCaught: conflicts,
    directBookings: direct.length,
    commissionSaved,
    checkinsCompleted: checkins,
    aiReplies: orgRow.aiRepliesDrafted,
    automatedStays: calendarStays + importedStays,
    hoursSaved: Math.round(minutes / 6) / 10,
  };
}
export type SavingsReport = Awaited<ReturnType<typeof savingsReport>>;
