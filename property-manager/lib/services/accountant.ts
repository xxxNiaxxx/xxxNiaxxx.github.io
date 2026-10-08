import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { dateToISO, isoToDate } from "@/lib/dates";
import { label } from "@/lib/labels";
import type { OrgContext } from "@/lib/permissions";
import { getAnnualReport, listStays } from "./tax";

type Cell = string | number | null;
export interface Sheet { name: string; title: string; header: string[]; rows: Cell[][] }

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The year for the accountant, sheet by sheet: summary, per property (ΑΜΑ),
 * ΤΑΚΚ per month and ΑΜΑ, every stay, expenses. Same figures as the
 * Φορολογικά page.
 */
export async function accountantPack(ctx: OrgContext, year: number) {
  const org = await db.organization.findUniqueOrThrow({ where: { id: ctx.organizationId }, select: { name: true } });
  const report = await getAnnualReport(ctx, year);
  const stays = await listStays(ctx, { from: `${year}-01-01`, to: `${year + 1}-01-01` }, new Date(), report.effectiveTaxRate);
  const business = report.regime === "BUSINESS";

  const summary: Sheet = {
    name: "Σύνοψη",
    title: `Σύνοψη ${year}`,
    header: ["", "Ποσό (€)"],
    rows: business
      ? [
          ["Καθεστώς", "Επιχείρηση"],
          ["Μισθώματα χωρίς ΦΠΑ", report.business.revenueExVat],
          ["ΦΠΑ 13%", report.business.vat],
          ["Τέλος παρεπιδημούντων 0,5%", report.business.presenceFee],
          ["ΤΑΚΚ που εισπράχθηκε", report.climateFeeCollected],
          ["Έξοδα (με προμήθειες)", report.business.expenses],
          ["Κέρδος προ φόρων", report.business.profitBeforeTax],
          ["Φόρος εισοδήματος (εκτίμηση, χωρίς ΕΦΚΑ)", report.business.estimatedTax],
        ]
      : [
          ["Καθεστώς", "Ιδιώτης (Ε2)"],
          ["Ακαθάριστα μισθώματα", report.individual.gross],
          ["Έκπτωση 5%", report.individual.deduction],
          ["Φορολογητέο", report.individual.taxable],
          ["ΤΑΚΚ που εισπράχθηκε (δεν είναι εισόδημα)", report.climateFeeCollected],
          ["Φόρος εισοδήματος (εκτίμηση)", report.individual.estimatedTax],
        ],
  };

  const byProperty: Sheet = {
    name: "Ανά ακίνητο",
    title: `Ανά ακίνητο (ΑΜΑ) ${year}`,
    header: ["ΑΜΑ", "Ακίνητο", "Διαμονές", "Νύχτες", "Ακαθάριστα (€)", "Μίσθωμα χωρίς ΦΠΑ", "ΦΠΑ", "Τέλος παρεπιδημούντων", "ΤΑΚΚ", "Προμήθειες", "Σύνολο εξόδων"],
    rows: report.byProperty.map((p) => [p.ama, p.name, p.stays, p.nights, p.gross, p.rent, p.vat, p.presenceFee, p.climateFee, p.platformFees, p.expenses]),
  };

  // ΤΑΚΚ per month and ΑΜΑ (each night counts in its own month).
  const takk = new Map<string, { period: string; ama: string | null; property: string; nights: number; amount: number }>();
  for (const s of stays) {
    for (const m of s.climateFeeMonths) {
      const key = `${m.period}|${s.propertyId}`;
      const row = takk.get(key) ?? { period: m.period, ama: s.ama, property: s.propertyName, nights: 0, amount: 0 };
      row.nights += m.nights;
      row.amount = round2(row.amount + m.amount);
      takk.set(key, row);
    }
  }
  const climate: Sheet = {
    name: "ΤΑΚΚ ανά μήνα",
    title: `ΤΑΚΚ ανά μήνα ${year}`,
    header: ["Μήνας", "ΑΜΑ", "Ακίνητο", "Νύχτες", "ΤΑΚΚ (€)"],
    rows: [...takk.values()].filter((r) => r.period.startsWith(String(year))).sort((a, b) => a.period.localeCompare(b.period) || a.property.localeCompare(b.property)).map((r) => [r.period, r.ama, r.property, r.nights, r.amount]),
  };

  const stayRows: Sheet = {
    name: "Διαμονές",
    title: `Διαμονές ${year}`,
    header: ["ΑΜΑ", "Ακίνητο", "Επισκέπτης", "Κωδικός", "Πηγή", "Κατάσταση", "Άφιξη", "Αναχώρηση", "Νύχτες", "Τιμή δωματίου", "Μίσθωμα χωρίς ΦΠΑ", "ΦΠΑ", "Τέλος 0,5%", "ΤΑΚΚ", "Προμήθεια", "Δήλωση διαμονής"],
    rows: stays.map((s) => [
      s.ama, s.propertyName, s.guestName, s.confirmationCode, label(s.source), label(s.status), s.checkIn, s.checkOut, s.nights,
      s.totalAmount, s.rent, s.vat, s.presenceFee, s.climateFee, s.commission, label(s.declaration.required ? s.declaration.status : "NOT_REQUIRED"),
    ]),
  };

  const expenseRows = await db.transaction.findMany({
    where: { organizationId: ctx.organizationId, type: "EXPENSE", transactionDate: { gte: isoToDate(`${year}-01-01`), lt: isoToDate(`${year + 1}-01-01`) } },
    include: { property: { select: { name: true, ama: true } } },
    orderBy: { transactionDate: "asc" },
  });
  const expenses: Sheet = {
    name: "Έξοδα",
    title: `Έξοδα ${year}`,
    header: ["Ημερομηνία", "ΑΜΑ", "Ακίνητο", "Κατηγορία", "Περιγραφή", "Ποσό (€)"],
    rows: expenseRows.map((e) => [dateToISO(e.transactionDate), e.property.ama, e.property.name, label(e.category), e.description, Number(e.amount)]),
  };

  return { organization: org.name, year, regime: report.regime, sheets: [summary, byProperty, climate, stayRows, expenses] };
}

/** The pack as an Excel workbook (one sheet per table). */
export async function accountantWorkbook(ctx: OrgContext, year: number) {
  const pack = await accountantPack(ctx, year);
  const wb = XLSX.utils.book_new();
  for (const s of pack.sheets) {
    const ws = XLSX.utils.aoa_to_sheet([[`${pack.organization} — ${s.title}`], [], s.header, ...s.rows]);
    ws["!cols"] = s.header.map((h, i) => ({ wch: Math.min(40, Math.max(10, h.length + 2, ...s.rows.map((r) => String(r[i] ?? "").length + 1))) }));
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  }
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
