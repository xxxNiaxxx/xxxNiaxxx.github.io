import { db } from "@/lib/db";
import { addDaysISO, isoToDate, monthRange, todayISO, zonedDateTime, zonedDayRange } from "@/lib/dates";
import { formatDateTime, formatDay } from "@/lib/format";
import type { OrgContext } from "@/lib/permissions";
import { getOccupancy } from "./financials";
import { getTaxOverview } from "./tax";
import { serializeReservation, serializeTask, toNumber } from "./serializers";
import { OPEN_STATUSES } from "./tasks";
import { conflictDetail, conflictTitle, listOpenConflicts } from "./calendar-conflicts";

export type AttentionKind = "DOUBLE_BOOKING" | "OVERDUE_TASK" | "MISSING_CLEANING" | "MISSING_INFO" | "NO_CHECKIN_MESSAGE" | "AI_ACTION" | "TAX_DEADLINE" | "COMPLIANCE" | "MISSING_AMOUNT";

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
  for (const c of await listOpenConflicts(ctx)) {
    attention.push({
      kind: "DOUBLE_BOOKING",
      severity: "high",
      title: conflictTitle(c),
      detail: conflictDetail(c),
      href: `/reservations/${c.overlaps[0].id}`,
    });
  }
  for (const t of overdueTasks) {
    attention.push({
      kind: "OVERDUE_TASK",
      severity: t.priority === "URGENT" || t.priority === "HIGH" ? "high" : "medium",
      title: `Καθυστερεί: ${t.title}`,
      detail: `${t.property.name} · προθεσμία ${t.dueAt ? formatDateTime(t.dueAt.toISOString()) : "—"}`,
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
          title: `Δεν έχει προγραμματιστεί καθαρισμός πριν την άφιξη: ${guest}`,
          detail: `${s.propertyName} · άφιξη ${formatDay(s.checkIn)}`,
          href: `/reservations/${r.id}`,
        });
      }
      if (r.messages.length === 0 && s.checkIn <= addDaysISO(today, 2)) {
        attention.push({
          kind: "NO_CHECKIN_MESSAGE",
          severity: "medium",
          title: `${guest}: δεν έχουν σταλεί οδηγίες άφιξης`,
          detail: `${s.propertyName} · άφιξη ${formatDay(s.checkIn)}`,
          href: `/reservations/${r.id}`,
        });
      }
    }
    const missing: string[] = [];
    if (!r.confirmationCode) missing.push("κωδικός επιβεβαίωσης");
    if (!r.guest.email && !r.guest.phone) missing.push("στοιχεία επικοινωνίας επισκέπτη");
    if (r.status === "PENDING") missing.push("επιβεβαίωση (εκκρεμεί)");
    if (missing.length) {
      attention.push({
        kind: "MISSING_INFO",
        severity: "low",
        title: `Κράτηση ${guest}: λείπει ${missing.join(", ")}`,
        detail: `${s.propertyName} · ${formatDay(s.checkIn)} → ${formatDay(s.checkOut)}`,
        href: `/reservations/${r.id}`,
      });
    }
  }
  for (const a of pendingActions) {
    attention.push({
      kind: "AI_ACTION",
      severity: "medium",
      title: `Ενέργεια AI προς έγκριση: ${humanizeActionType(a.type)}`,
      detail: `Προτάθηκε ${formatDateTime(a.createdAt.toISOString())}`,
      href: a.conversationId ? `/ai?c=${a.conversationId}` : "/ai",
    });
  }
  attention.push(...(await taxAttention(ctx, now)));
  // Stays brought in by an iCal calendar have no price yet: taxes and income are incomplete.
  const noAmount = await db.reservation.findMany({
    where: { organizationId: org, calendarFeedId: { not: null }, complimentary: false, totalAmount: 0, status: { in: ["CONFIRMED", "COMPLETED"] } },
    select: { id: true, checkIn: true },
    orderBy: { checkIn: "asc" },
  });
  if (noAmount.length) {
    attention.push({
      kind: "MISSING_AMOUNT",
      severity: "medium",
      title: noAmount.length === 1 ? "1 κράτηση από ημερολόγιο χωρίς ποσό" : `${noAmount.length} κρατήσεις από ημερολόγιο χωρίς ποσό`,
      detail: "Συμπληρώστε το ποσό ή κάντε εισαγωγή του αρχείου κρατήσεων του Booking/Airbnb.",
      href: noAmount.length === 1 ? `/reservations/${noAmount[0].id}` : "/reservations/import",
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
      return "αποστολή μηνύματος σε επισκέπτη";
    case "CREATE_TASK":
      return "δημιουργία εργασίας";
    default:
      return type.toLowerCase().replace(/_/g, " ");
  }
}

/** AADE deadlines and compliance gaps worth surfacing on the dashboard. */
async function taxAttention(ctx: OrgContext, now: Date): Promise<AttentionItem[]> {
  const tax = await getTaxOverview(ctx, now);
  const items: AttentionItem[] = [];
  const overdue = tax.pendingDeclarations.filter((s) => s.declaration.overdue);
  const dueSoon = tax.pendingDeclarations.filter((s) => !s.declaration.overdue && s.declaration.daysLeft <= 7);
  if (overdue.length) {
    items.push({
      kind: "TAX_DEADLINE",
      severity: "high",
      title: `${overdue.length} ${overdue.length > 1 ? "δηλώσεις" : "δήλωση"} διαμονής στην ΑΑΔΕ ${overdue.length > 1 ? "έχουν" : "έχει"} καθυστερήσει`,
      detail: `Πρόστιμο 100 € ανά εκπρόθεσμη δήλωση · π.χ. ${overdue[0].guestName}, ${overdue[0].propertyName}`,
      href: "/tax",
    });
  }
  if (dueSoon.length) {
    items.push({
      kind: "TAX_DEADLINE",
      severity: "medium",
      title: `${dueSoon.length} ${dueSoon.length > 1 ? "δηλώσεις" : "δήλωση"} διαμονής έως ${formatDay(dueSoon[0].declaration.deadline)}`,
      detail: "Δήλωση Βραχυχρόνιας Διαμονής στο myAADE",
      href: "/tax",
    });
  }
  for (const m of tax.monthly.filter((x) => x.closed && !x.climateFeeFiled && x.climateFee > 0)) {
    const daysLeft = Math.round((new Date(`${m.climateFeeDeadline}T00:00:00Z`).getTime() - new Date(`${tax.today}T00:00:00Z`).getTime()) / 86_400_000);
    if (daysLeft > 10) continue;
    items.push({
      kind: "TAX_DEADLINE",
      severity: m.climateFeeOverdue ? "high" : "medium",
      title: `ΤΑΚΚ ${m.period}: ${m.climateFee} € ${m.climateFeeOverdue ? "εκπρόθεσμο" : `έως ${formatDay(m.climateFeeDeadline)}`}`,
      detail: "Μηνιαία δήλωση ΤΑΚΚ στο myAADE",
      href: "/tax",
    });
  }
  for (const p of tax.compliance) {
    if (!p.ama) items.push({ kind: "COMPLIANCE", severity: "high", title: `${p.name}: δεν έχει ΑΜΑ`, detail: "Απαιτείται για βραχυχρόνια μίσθωση", href: `/properties/${p.propertyId}` });
    if (p.insuranceStatus === "EXPIRED" || p.insuranceStatus === "EXPIRING") {
      items.push({ kind: "COMPLIANCE", severity: p.insuranceStatus === "EXPIRED" ? "high" : "medium", title: `${p.name}: η ασφάλιση αστικής ευθύνης ${p.insuranceStatus === "EXPIRED" ? "έληξε" : "λήγει σύντομα"}`, detail: `Λήξη ${p.insuranceExpiresOn ? formatDay(p.insuranceExpiresOn, { day: "numeric", month: "long", year: "numeric" }) : "—"}`, href: `/properties/${p.propertyId}` });
    }
  }
  return items;
}
