import { db } from "@/lib/db";
import { addDaysISO, isoToDate, monthRange, todayISO, zonedDateTime, zonedDayRange } from "@/lib/dates";
import type { OrgContext } from "@/lib/permissions";
import { getOccupancy } from "./financials";
import { serializeReservation, serializeTask, toNumber } from "./serializers";
import { OPEN_STATUSES } from "./tasks";

export type AttentionKind = "OVERDUE_TASK" | "MISSING_CLEANING" | "MISSING_INFO" | "NO_CHECKIN_MESSAGE" | "AI_ACTION";

export interface AttentionItem {
  kind: AttentionKind;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  href: string;
}

const reservationInclude = {
  property: { select: { id: true, name: true } },
  guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
} as const;

/** Everything the dashboard needs, computed for "now" in the app time zone. */
export async function getDashboard(ctx: OrgContext, now: Date = new Date()) {
  const org = ctx.organizationId;
  const today = todayISO(now);
  const todayDate = isoToDate(today);
  const soon = addDaysISO(today, 3);
  const month = monthRange(today);
  const todayRange = zonedDayRange(today);

  const [
    propertyCounts,
    inHouse,
    checkIns,
    checkOuts,
    todaysTasks,
    overdueTasks,
    monthIncome,
    occupancy,
    upcoming,
    pendingActions,
  ] = await Promise.all([
    db.property.groupBy({ by: ["status"], where: { organizationId: org }, _count: true }),
    db.reservation.count({
      where: { organizationId: org, status: "CONFIRMED", checkIn: { lte: todayDate }, checkOut: { gt: todayDate } },
    }),
    db.reservation.findMany({
      where: { organizationId: org, status: "CONFIRMED", checkIn: todayDate },
      include: reservationInclude,
      orderBy: { property: { name: "asc" } },
    }),
    db.reservation.findMany({
      where: { organizationId: org, status: { in: ["CONFIRMED", "COMPLETED"] }, checkOut: todayDate },
      include: reservationInclude,
      orderBy: { property: { name: "asc" } },
    }),
    db.task.findMany({
      where: { organizationId: org, status: { in: OPEN_STATUSES }, dueAt: { gte: todayRange.start, lt: todayRange.end } },
      include: { property: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true, email: true } } },
      orderBy: { dueAt: "asc" },
    }),
    db.task.findMany({
      where: { organizationId: org, status: { in: OPEN_STATUSES }, dueAt: { lt: todayRange.start } },
      include: { property: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true, email: true } } },
      orderBy: { dueAt: "asc" },
    }),
    db.transaction.aggregate({
      where: {
        organizationId: org,
        type: "INCOME",
        transactionDate: { gte: isoToDate(month.from), lt: isoToDate(month.to) },
      },
      _sum: { amount: true },
    }),
    getOccupancy(ctx, month.from, month.to),
    db.reservation.findMany({
      where: {
        organizationId: org,
        status: { in: ["CONFIRMED", "PENDING"] },
        checkIn: { gte: todayDate, lt: isoToDate(addDaysISO(today, 14)) },
      },
      include: {
        ...reservationInclude,
        tasks: { where: { status: { not: "CANCELLED" } }, select: { type: true } },
        messages: { where: { direction: "OUTBOUND", status: "SENT" }, select: { id: true } },
      },
      orderBy: { checkIn: "asc" },
    }),
    db.aIAction.findMany({
      where: { organizationId: org, status: "PROPOSED" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  // Cleaning tasks per property due up to the end of the "soon" window, for check-ins without a linked cleaning task.
  const cleaningByProperty = await db.task.findMany({
    where: {
      organizationId: org,
      type: "CLEANING",
      status: { not: "CANCELLED" },
      dueAt: { gte: zonedDateTime(addDaysISO(today, -3)), lt: zonedDateTime(addDaysISO(soon, 1)) },
    },
    select: { propertyId: true, dueAt: true },
  });

  const attention: AttentionItem[] = [];
  for (const t of overdueTasks) {
    attention.push({
      kind: "OVERDUE_TASK",
      severity: t.priority === "URGENT" || t.priority === "HIGH" ? "high" : "medium",
      title: `Overdue: ${t.title}`,
      detail: `${t.property.name} · due ${t.dueAt?.toISOString()}`,
      href: `/tasks?tab=overdue`,
    });
  }
  for (const r of upcoming) {
    const s = serializeReservation(r);
    const guest = s.guestName ?? "Guest";
    if (r.status === "CONFIRMED" && s.checkIn <= soon) {
      const linkedCleaning = r.tasks.some((t) => t.type === "CLEANING");
      const checkInEnd = zonedDateTime(addDaysISO(s.checkIn, 1));
      const checkInFloor = zonedDateTime(addDaysISO(s.checkIn, -3));
      const propertyCleaning = cleaningByProperty.some(
        (c) => c.propertyId === r.propertyId && c.dueAt && c.dueAt < checkInEnd && c.dueAt >= checkInFloor,
      );
      if (!linkedCleaning && !propertyCleaning) {
        attention.push({
          kind: "MISSING_CLEANING",
          severity: s.checkIn === today ? "high" : "medium",
          title: `No cleaning scheduled before ${guest}'s check-in`,
          detail: `${s.propertyName} · check-in ${s.checkIn}`,
          href: `/reservations/${r.id}`,
        });
      }
      if (r.messages.length === 0 && s.checkIn <= addDaysISO(today, 2)) {
        attention.push({
          kind: "NO_CHECKIN_MESSAGE",
          severity: "medium",
          title: `${guest} hasn't received check-in instructions`,
          detail: `${s.propertyName} · check-in ${s.checkIn}`,
          href: `/reservations/${r.id}`,
        });
      }
    }
    const missing: string[] = [];
    if (!r.confirmationCode) missing.push("confirmation code");
    if (!r.guest.email && !r.guest.phone) missing.push("guest contact details");
    if (r.status === "PENDING") missing.push("confirmation (still pending)");
    if (missing.length) {
      attention.push({
        kind: "MISSING_INFO",
        severity: "low",
        title: `${guest}'s reservation is missing ${missing.join(", ")}`,
        detail: `${s.propertyName} · ${s.checkIn} → ${s.checkOut}`,
        href: `/reservations/${r.id}`,
      });
    }
  }
  for (const a of pendingActions) {
    attention.push({
      kind: "AI_ACTION",
      severity: "medium",
      title: `AI action awaiting approval: ${humanizeActionType(a.type)}`,
      detail: `Proposed ${a.createdAt.toISOString()}`,
      href: a.conversationId ? `/ai?c=${a.conversationId}` : "/ai",
    });
  }
  const severityRank = { high: 0, medium: 1, low: 2 };
  attention.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  const counts = Object.fromEntries(propertyCounts.map((p) => [p.status, p._count])) as Record<string, number>;
  const tasks = todaysTasks.map((t) => serializeTask(t, now));
  return {
    today,
    summary: {
      properties: (counts.ACTIVE ?? 0) + (counts.INACTIVE ?? 0),
      activeProperties: counts.ACTIVE ?? 0,
      activeReservations: inHouse,
      checkInsToday: checkIns.length,
      checkOutsToday: checkOuts.length,
      monthlyRevenue: toNumber(monthIncome._sum.amount),
      occupancy: occupancy.rate,
      currency: "EUR",
    },
    attention,
    todayAgenda: {
      checkIns: checkIns.map(serializeReservation),
      checkOuts: checkOuts.map(serializeReservation),
      cleaning: tasks.filter((t) => t.type === "CLEANING"),
      maintenance: tasks.filter((t) => t.type === "MAINTENANCE"),
      other: tasks.filter((t) => t.type !== "CLEANING" && t.type !== "MAINTENANCE"),
    },
    overdueTasks: overdueTasks.map((t) => serializeTask(t, now)),
    pendingActionCount: pendingActions.length,
  };
}
export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;

export function humanizeActionType(type: string) {
  switch (type) {
    case "SEND_GUEST_MESSAGE":
      return "send guest message";
    case "CREATE_TASK":
      return "create task";
    default:
      return type.toLowerCase().replace(/_/g, " ");
  }
}
