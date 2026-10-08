import { db } from "@/lib/db";
import { addDaysISO, diffDaysISO, isoToDate, monthRange, todayISO } from "@/lib/dates";
import { sendEmail } from "@/lib/email";
import type { OrgContext } from "@/lib/permissions";
import { periodOf } from "@/lib/tax/gr";
import { listOpenConflicts } from "./calendar-conflicts";
import { getOccupancy } from "./financials";
import { BOOKING_REQUEST_NOTE } from "./guest-pages";
import { getTaxOverview } from "./tax";

const eur = (n: number) => `${n.toLocaleString("el-GR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const MONTHS = ["Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος", "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"];

/** Public address of the app for links in emails sent by the cron. */
function appUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  return url.replace(/\/$/, "") || null;
}

async function adminEmails(organizationId: string) {
  const rows = await db.organizationMember.findMany({
    where: { organizationId, role: { in: ["OWNER", "ADMIN"] } },
    select: { user: { select: { email: true } } },
  });
  return rows.map((r) => r.user.email);
}

const systemCtx = (organizationId: string): OrgContext => ({ userId: "system", organizationId, role: "OWNER" });

/**
 * What needs doing soon: stay declarations due within 3 days or late, ΤΑΚΚ
 * returns due within 5 days or late, insurance expiring within 30 days,
 * possible double bookings and booking requests waiting for an answer.
 */
export async function reminderItems(ctx: OrgContext, now = new Date()) {
  const today = todayISO(now);
  const tax = await getTaxOverview(ctx, now);
  const items: string[] = [];
  for (const s of tax.pendingDeclarations.filter((x) => x.declaration.overdue || x.declaration.daysLeft <= 3)) {
    items.push(`${s.declaration.overdue ? "ΕΚΠΡΟΘΕΣΜΗ" : `Έως ${dm(s.declaration.deadline)}`} — δήλωση διαμονής: ${s.guestName}, ${s.propertyName} (${dm(s.checkIn)}–${dm(s.checkOut)}). Πρόστιμο εκπρόθεσμης: 100 €.`);
  }
  for (const m of tax.monthly.filter((x) => x.closed && x.climateFee > 0 && !x.climateFeeFiled && diffDaysISO(today, x.climateFeeDeadline) <= 5)) {
    items.push(`${m.climateFeeOverdue ? "ΕΚΠΡΟΘΕΣΜΟ" : `Έως ${dm(m.climateFeeDeadline)}`} — ΤΑΚΚ ${m.period}: ${eur(m.climateFee)}.`);
  }
  for (const c of tax.compliance.filter((x) => x.insuranceStatus === "EXPIRING" || x.insuranceStatus === "EXPIRED")) {
    items.push(`${c.name}: η ασφάλιση ${c.insuranceStatus === "EXPIRED" ? "έχει λήξει" : `λήγει ${dm(c.insuranceExpiresOn!)}`}.`);
  }
  for (const c of await listOpenConflicts(ctx)) {
    items.push(`Πιθανή διπλοκράτηση στο ${c.propertyName}: ${c.sourceLabel} ${c.startLabel}–${c.endLabel}.`);
  }
  const requests = await db.reservation.count({
    where: { organizationId: ctx.organizationId, status: "PENDING", source: "DIRECT", notes: { startsWith: BOOKING_REQUEST_NOTE }, checkOut: { gt: isoToDate(today) } },
  });
  if (requests) items.push(`${requests} ${requests === 1 ? "αίτημα κράτησης περιμένει" : "αιτήματα κράτησης περιμένουν"} απάντηση.`);
  return items;
}

/** The month's figures for the monthly email. */
export async function monthlyReport(ctx: OrgContext, period: string, now = new Date()) {
  const { from, to } = monthRange(`${period}-01`);
  const stays = await db.reservation.findMany({
    where: { organizationId: ctx.organizationId, status: { in: ["CONFIRMED", "COMPLETED"] }, complimentary: false, checkOut: { gte: isoToDate(from), lt: isoToDate(to) } },
    select: { totalAmount: true, commission: true, checkIn: true, checkOut: true },
  });
  const revenue = stays.reduce((a, s) => a + Number(s.totalAmount), 0);
  const commission = stays.reduce((a, s) => a + Number(s.commission), 0);
  const occupancy = await getOccupancy(ctx, from, to);
  const tax = await getTaxOverview(ctx, now);
  const month = tax.monthly.find((m) => m.period === period);
  const next = monthRange(to);
  const upcoming = await db.reservation.count({
    where: { organizationId: ctx.organizationId, status: "CONFIRMED", checkIn: { gte: isoToDate(next.from), lt: isoToDate(next.to) } },
  });
  return {
    period,
    stays: stays.length,
    revenue: Math.round(revenue * 100) / 100,
    commission: Math.round(commission * 100) / 100,
    occupancy: occupancy.rate,
    climateFee: month?.climateFee ?? 0,
    climateFeeDeadline: month?.climateFeeDeadline ?? null,
    declarationsPending: tax.totals.declarationsDue,
    upcomingStays: upcoming,
  };
}

/**
 * Cron, once a day: each organization (with reminders on) gets at most one
 * reminder email a day, when something is due; and on the first days of a
 * month, the report of the month before.
 */
export async function sendScheduledEmails(now = new Date()) {
  const today = todayISO(now);
  const lastMonth = periodOf(addDaysISO(`${periodOf(today)}-01`, -1));
  const orgs = await db.organization.findMany({ where: { emailReminders: true } });
  let reminders = 0;
  let reports = 0;
  const base = appUrl();

  for (const org of orgs) {
    const ctx = systemCtx(org.id);
    const to = await adminEmails(org.id);
    if (!to.length) continue;

    if (org.lastReminderOn !== today) {
      const items = await reminderItems(ctx, now);
      if (items.length) {
        const sent = await sendEmail({
          to,
          subject: `${org.name}: ${items.length} ${items.length === 1 ? "εκκρεμότητα" : "εκκρεμότητες"} για σήμερα`,
          text: `Καλημέρα! Αυτά χρειάζονται την προσοχή σας:\n\n${items.map((i) => `• ${i}`).join("\n")}\n\nΤις υπενθυμίσεις τις κλείνετε από τις Ρυθμίσεις.`,
          ...(base ? { action: { label: "Άνοιγμα εφαρμογής", url: `${base}/dashboard` } } : {}),
        });
        if (sent) {
          reminders++;
          await db.organization.update({ where: { id: org.id }, data: { lastReminderOn: today } });
        }
      }
    }

    if (org.lastMonthlyReport !== lastMonth && Number(today.slice(8, 10)) <= 3) {
      const r = await monthlyReport(ctx, lastMonth, now);
      const [y, m] = lastMonth.split("-").map(Number);
      const sent = await sendEmail({
        to,
        subject: `${org.name}: ο ${MONTHS[m - 1]} ${y} με μια ματιά`,
        text: [
          `Ο ${MONTHS[m - 1]} σε αριθμούς:`,
          [
            `• Διαμονές που ολοκληρώθηκαν: ${r.stays}`,
            `• Έσοδα (τιμή δωματίων): ${eur(r.revenue)}`,
            `• Προμήθειες πλατφορμών: ${eur(r.commission)}`,
            `• Πληρότητα: ${Math.round(r.occupancy * 100)}%`,
            r.climateFee ? `• ΤΑΚΚ προς απόδοση: ${eur(r.climateFee)}${r.climateFeeDeadline ? ` έως ${dm(r.climateFeeDeadline)}` : ""}` : null,
            r.declarationsPending ? `• Δηλώσεις διαμονής που εκκρεμούν: ${r.declarationsPending}` : null,
            `• Κρατήσεις για τον επόμενο μήνα: ${r.upcomingStays}`,
          ].filter(Boolean).join("\n"),
          "Καλό μήνα!",
        ].join("\n\n"),
        ...(base ? { action: { label: "Οικονομικά", url: `${base}/financials` } } : {}),
      });
      if (sent) {
        reports++;
        await db.organization.update({ where: { id: org.id }, data: { lastMonthlyReport: lastMonth } });
      }
    }
  }
  return { organizations: orgs.length, reminders, reports };
}
