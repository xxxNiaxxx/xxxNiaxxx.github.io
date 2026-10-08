import type { Prisma, TaxFilingKind } from "@prisma/client";
import { z } from "zod";
import { defaultPaymentMethod, PAYMENT_METHODS } from "@/lib/aade";
import { RESERVATION_SOURCES } from "@/lib/reservation-sources";
import { db } from "@/lib/db";
import { addDaysISO, dateToISO, diffDaysISO, isoToDate, todayISO } from "@/lib/dates";
import { AppError, notFound } from "@/lib/errors";
import { hasRole, type OrgContext } from "@/lib/permissions";
import {
  businessBreakdown,
  businessIncomeTax,
  DEFAULT_COMMISSION_RATES,
  climateFeeDeadline,
  climateFeeByMonth,
  COMPLIANCE_ITEMS,
  FLAT_DEDUCTION_RATE,
  periodOf,
  rentalIncomeTax,
  rentalScale,
  resolveRegime,
  SHORT_TERM_MAX_NIGHTS_EXCLUSIVE,
  stayDeclarationDeadline,
  type ComplianceKey,
  type PropertyKind,
  type TaxRegime,
} from "@/lib/tax/gr";
import { label } from "@/lib/labels";
import { toNumber } from "./serializers";

const round2 = (n: number) => Math.round(n * 100) / 100;

// ─── Context ─────────────────────────────────────────────────────────

export async function getTaxContext(ctx: OrgContext) {
  const [org, properties] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: ctx.organizationId }, select: { taxRegime: true, commissionRates: true, businessTaxRate: true } }),
    db.property.findMany({
      where: { organizationId: ctx.organizationId },
      select: { id: true, name: true, ama: true, kind: true, areaSqm: true, status: true, compliance: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const withAma = properties.filter((p) => p.ama).length;
  return {
    setting: org.taxRegime,
    regime: resolveRegime(org.taxRegime, withAma),
    propertiesWithAma: withAma,
    properties,
    /** Commission % by booking source (organization overrides on top of the defaults). */
    commissionRates: { ...DEFAULT_COMMISSION_RATES, ...((org.commissionRates as Record<string, number> | null) ?? {}) },
    /** Own business income tax rate in %, or null to estimate from the scale. */
    businessTaxRate: org.businessTaxRate == null ? null : toNumber(org.businessTaxRate),
  };
}

const settingsSchema = z.object({
  taxRegime: z.enum(["AUTO", "INDIVIDUAL", "BUSINESS"]).optional(),
  // Partial: the settings save one platform at a time.
  commissionRates: z.partialRecord(z.enum(RESERVATION_SOURCES), z.coerce.number().min(0).max(50)).optional(),
  businessTaxRate: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().min(0).max(60).nullable()).optional(),
});

export async function updateTaxSettings(ctx: OrgContext, input: unknown) {
  if (!hasRole(ctx, "ADMIN")) throw new AppError("FORBIDDEN", "Μόνο ο ιδιοκτήτης και οι διαχειριστές αλλάζουν τις φορολογικές ρυθμίσεις");
  const data = settingsSchema.parse(input);
  const current = await getTaxContext(ctx);
  await db.organization.update({
    where: { id: ctx.organizationId },
    data: {
      ...(data.taxRegime ? { taxRegime: data.taxRegime } : {}),
      ...(data.commissionRates ? { commissionRates: { ...current.commissionRates, ...data.commissionRates } } : {}),
      ...(data.businessTaxRate !== undefined ? { businessTaxRate: data.businessTaxRate } : {}),
    },
  });
  return getTaxContext(ctx);
}

// ─── Stays ───────────────────────────────────────────────────────────

const stayInclude = {
  property: { select: { id: true, name: true, ama: true, kind: true, areaSqm: true } },
  guest: { select: { firstName: true, lastName: true, idType: true, idNumber: true } },
} as const;
type StayRow = Prisma.ReservationGetPayload<{ include: typeof stayInclude }>;

/**
 * Everything tax-related about one reservation. With `incomeTaxRate` (the
 * year's effective rate, see incomeTaxRates) it also estimates the income tax
 * of the stay and what is left for the owner.
 */
export function stayTaxInfo(r: StayRow, regime: TaxRegime, today: string, incomeTaxRate?: number) {
  const checkIn = dateToISO(r.checkIn);
  const checkOut = dateToISO(r.checkOut);
  const nights = diffDaysISO(checkIn, checkOut);
  const total = toNumber(r.totalAmount);
  const booked = r.status === "CONFIRMED" || r.status === "COMPLETED";
  const cancelledPaid = r.status === "CANCELLED" && total > 0;
  const longStay = nights >= SHORT_TERM_MAX_NIGHTS_EXCLUSIVE;
  // Free stay (no rent) is not a short-term rental: no ΤΑΚΚ, VAT, presence fee or declaration.
  const free = r.complimentary;
  const trigger = r.status === "CANCELLED" ? (r.cancelledAt ? dateToISO(r.cancelledAt) : checkOut) : checkOut;
  const requiresDeclaration = (booked || cancelledPaid) && !longStay && !free && r.declarationStatus !== "NOT_REQUIRED";
  const deadline = stayDeclarationDeadline(trigger);
  const due = requiresDeclaration && r.declarationStatus === "PENDING" && trigger <= today;
  const climateFeeMonths = booked && !free ? climateFeeByMonth({ checkIn, checkOut, totalAmount: total }, { kind: r.property.kind as PropertyKind, areaSqm: r.property.areaSqm }) : [];
  const climateFee = round2(climateFeeMonths.reduce((a, m) => a + m.amount, 0));
  const business = regime === "BUSINESS" && !free ? businessBreakdown(total) : null;
  const commission = toNumber(r.commission);
  const rent = business ? business.rent : total;
  const vat = business?.vat ?? 0;
  const presenceFee = business?.presenceFee ?? 0;
  const earns = booked || cancelledPaid;
  // Individuals: Ε2 on rent − 5% (commission not deductible). Business: on rent − commission.
  const taxableIncome = !earns || free || longStay ? 0 : business ? rent - commission : total * (1 - FLAT_DEDUCTION_RATE);
  const incomeTax = incomeTaxRate === undefined ? null : round2(Math.max(0, taxableIncome) * incomeTaxRate);
  return {
    reservationId: r.id,
    propertyId: r.propertyId,
    propertyName: r.property.name,
    ama: r.property.ama,
    guestName: `${r.guest.firstName} ${r.guest.lastName}`,
    confirmationCode: r.confirmationCode,
    source: r.source,
    status: r.status,
    complimentary: free,
    checkIn,
    checkOut,
    nights,
    totalAmount: total,
    climateFee,
    /** ΤΑΚΚ split by the month of each night — each part goes into that month's return. */
    climateFeeMonths,
    rent,
    vat,
    presenceFee,
    /** What the guest pays in total: room price + ΤΑΚΚ (Booking's "Συνολική τιμή κράτησης"). */
    guestTotal: round2(total + climateFee),
    commission,
    incomeTaxRate: incomeTaxRate ?? null,
    /** Estimated income tax of this stay at the year's effective rate. */
    incomeTax,
    /** Left for the owner after ΦΠΑ, τέλος, commission and income tax (ΤΑΚΚ is passed on). */
    net: incomeTax === null ? null : round2(total - vat - presenceFee - commission - incomeTax),
    longStay,
    declaration: {
      required: requiresDeclaration,
      status: r.declarationStatus,
      declaredAt: r.declaredAt?.toISOString() ?? null,
      /** Date the obligation starts (departure, or cancellation for paid cancellations). */
      triggerDate: trigger,
      deadline,
      due,
      overdue: due && deadline < today,
      daysLeft: diffDaysISO(today, deadline),
    },
  };
}
export type StayTaxInfo = ReturnType<typeof stayTaxInfo>;

const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/**
 * The values to type into the AADE stay declaration, in the form's order.
 * The amount is the agreed rent: without ΤΑΚΚ, and for a business also
 * without VAT and the 0,5% fee.
 */
export function declarationForm(r: StayRow, info: StayTaxInfo) {
  const method = (r.paymentMethod ?? defaultPaymentMethod(r.source)) as keyof typeof PAYMENT_METHODS | null;
  const platform = defaultPaymentMethod(r.source) !== null;
  const name = [r.guest.firstName, r.guest.lastName === "—" ? "" : r.guest.lastName].join(" ").trim();
  const fields: { key: string; label: string; value: string | null; optional?: boolean }[] = [
    { key: "ama", label: "ΑΜΑ ακινήτου", value: r.property.ama },
    // Platform stays have a booking number; direct ones may not.
    { key: "bookingNumber", label: "Αριθμός κράτησης", value: r.confirmationCode ?? r.externalId ?? null, optional: !platform },
    { key: "guestName", label: "Ονοματεπώνυμο μισθωτή", value: name || null },
    { key: "idNumber", label: "ΑΦΜ / Αριθμός διαβατηρίου", value: r.guest.idNumber },
    { key: "checkIn", label: "Ημερομηνία άφιξης", value: dmy(info.checkIn) },
    { key: "checkOut", label: "Ημερομηνία αναχώρησης", value: dmy(info.checkOut) },
    { key: "paymentMethod", label: "Τρόπος πληρωμής", value: method ? PAYMENT_METHODS[method] : null },
    { key: "amount", label: "Συνολικό συμφωνηθέν μίσθωμα (€)", value: info.rent > 0 ? info.rent.toFixed(2).replace(".", ",") : null },
  ];
  return {
    fields,
    /** Labels of the values still missing (fill them in on the guest or the reservation). */
    missing: fields.filter((f) => !f.value && !f.optional).map((f) => f.label),
    paymentMethodIsDefault: !r.paymentMethod && !!method,
    cancelled: r.status === "CANCELLED",
  };
}

export async function listStays(ctx: OrgContext, range: { from: string; to: string }, now = new Date(), incomeTaxRate?: number) {
  const { regime } = await getTaxContext(ctx);
  const rows = await db.reservation.findMany({
    where: { organizationId: ctx.organizationId, checkOut: { gte: isoToDate(range.from), lt: isoToDate(range.to) } },
    include: stayInclude,
    orderBy: { checkOut: "asc" },
  });
  const today = todayISO(now);
  return rows.map((r) => stayTaxInfo(r, regime, today, incomeTaxRate)).filter((s) => s.status !== "PENDING");
}

export async function setStayDeclaration(ctx: OrgContext, reservationId: string, input: unknown) {
  const { status } = z.object({ status: z.enum(["PENDING", "DECLARED", "NOT_REQUIRED"]) }).parse(input);
  const r = await db.reservation.findFirst({ where: { id: reservationId, organizationId: ctx.organizationId } });
  if (!r) throw notFound("Reservation");
  await db.reservation.update({
    where: { id: reservationId },
    data: { declarationStatus: status, declaredAt: status === "DECLARED" ? new Date() : null },
  });
  return { reservationId, status };
}

// ─── Filings ─────────────────────────────────────────────────────────

const filingSchema = z.object({
  kind: z.enum(["CLIMATE_FEE", "PRESENCE_FEE", "VAT"]),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Μορφή ΕΕΕΕ-ΜΜ"),
  amount: z.coerce.number().min(0).max(10_000_000),
  reference: z.string().trim().max(100).optional(),
});

export async function markFiling(ctx: OrgContext, input: unknown) {
  const data = filingSchema.parse(input);
  const row = await db.taxFiling.upsert({
    where: { organizationId_kind_period: { organizationId: ctx.organizationId, kind: data.kind, period: data.period } },
    create: { ...data, organizationId: ctx.organizationId, filedByUserId: ctx.userId },
    update: { amount: data.amount, reference: data.reference, filedAt: new Date(), filedByUserId: ctx.userId },
  });
  return { id: row.id, kind: row.kind, period: row.period, amount: toNumber(row.amount), filedAt: row.filedAt.toISOString() };
}

export async function unmarkFiling(ctx: OrgContext, input: unknown) {
  const { kind, period } = filingSchema.pick({ kind: true, period: true }).parse(input);
  await db.taxFiling.deleteMany({ where: { organizationId: ctx.organizationId, kind, period } });
  return { kind, period, filed: false };
}

// ─── Overview ────────────────────────────────────────────────────────

function lastMonths(today: string, count: number) {
  const periods: string[] = [];
  let cursor = `${periodOf(today)}-01`;
  for (let i = 0; i < count; i++) {
    periods.push(periodOf(cursor));
    cursor = `${periodOf(addDaysISO(cursor, -1))}-01`;
  }
  return periods;
}

/** What the organization owes AADE, what is due soon and what is missing. */
export async function getTaxOverview(ctx: OrgContext, now = new Date()) {
  const today = todayISO(now);
  const tax = await getTaxContext(ctx);
  const months = lastMonths(today, 12);
  const from = `${months.at(-1)}-01`;
  const [rows, filings] = await Promise.all([
    db.reservation.findMany({
      where: {
        organizationId: ctx.organizationId,
        OR: [{ checkOut: { gte: isoToDate(from) } }, { declarationStatus: "PENDING", checkOut: { lt: isoToDate(today) } }],
      },
      include: stayInclude,
      orderBy: { checkOut: "asc" },
    }),
    db.taxFiling.findMany({ where: { organizationId: ctx.organizationId, period: { gte: months.at(-1)! } } }),
  ]);
  const stays = rows.map((r) => stayTaxInfo(r, tax.regime, today));

  const pendingDeclarations = stays.filter((s) => s.declaration.due).sort((a, b) => a.declaration.deadline.localeCompare(b.declaration.deadline));

  const filed = (kind: TaxFilingKind, period: string) => filings.find((f) => f.kind === kind && f.period === period);
  const monthly = months
    .map((period) => {
      const booked = stays.filter((s) => s.status === "CONFIRMED" || s.status === "COMPLETED");
      // ΤΑΚΚ: nights spent in this month, also from stays that started earlier or end later.
      const nightsInMonth = booked.flatMap((s) => {
        const part = s.climateFeeMonths.find((m) => m.period === period);
        if (!part) return [];
        // Only nights already spent count (relevant for the month in progress).
        const spent = Math.min(part.nights, Math.max(0, diffDaysISO(s.checkIn > `${period}-01` ? s.checkIn : `${period}-01`, today)));
        return spent > 0 ? [{ nights: spent, amount: spent === part.nights ? part.amount : round2((part.amount / part.nights) * spent) }] : [];
      });
      const climateFee = round2(nightsInMonth.reduce((a, m) => a + m.amount, 0));
      // Revenue, VAT and presence fee follow the check-out (receipt) month.
      const inMonth = booked.filter((s) => periodOf(s.checkOut) === period && s.checkOut <= today);
      const deadline = climateFeeDeadline(period);
      const climateFiling = filed("CLIMATE_FEE", period);
      return {
        period,
        stays: nightsInMonth.length,
        nights: nightsInMonth.reduce((a, m) => a + m.nights, 0),
        gross: round2(inMonth.reduce((a, s) => a + s.totalAmount, 0)),
        climateFee,
        climateFeeDeadline: deadline,
        climateFeeFiled: climateFiling ? { amount: toNumber(climateFiling.amount), filedAt: climateFiling.filedAt.toISOString(), reference: climateFiling.reference } : null,
        climateFeeOverdue: !climateFiling && climateFee > 0 && deadline < today,
        vat: round2(inMonth.reduce((a, s) => a + s.vat, 0)),
        presenceFee: round2(inMonth.reduce((a, s) => a + s.presenceFee, 0)),
        vatFiled: Boolean(filed("VAT", period)),
        presenceFeeFiled: Boolean(filed("PRESENCE_FEE", period)),
        /** The month has ended, so its return can be filed. */
        closed: `${period}-01` < `${periodOf(today)}-01`,
      };
    })
    .reverse();

  const compliance = tax.properties
    .filter((p) => p.status === "ACTIVE")
    .map((p) => {
      const c = (p.compliance ?? {}) as Partial<Record<ComplianceKey, boolean>> & { insuranceExpiresOn?: string };
      const missing = COMPLIANCE_ITEMS.filter((i) => !c[i.key]).map((i) => i.label);
      const insurance = c.insuranceExpiresOn ?? null;
      return {
        propertyId: p.id,
        name: p.name,
        ama: p.ama,
        kind: p.kind,
        areaSqm: p.areaSqm,
        missing,
        insuranceExpiresOn: insurance,
        insuranceStatus: !insurance ? "MISSING" : insurance < today ? "EXPIRED" : diffDaysISO(today, insurance) <= 30 ? "EXPIRING" : "OK",
      };
    });

  const warnings: { level: "high" | "medium" | "low"; title: string; detail: string }[] = [];
  for (const p of compliance.filter((c) => !c.ama)) {
    warnings.push({ level: "high", title: `${p.name}: δεν έχει ΑΜΑ`, detail: "Καταχωρίστε το ακίνητο στο Μητρώο Βραχυχρόνιας Διαμονής της ΑΑΔΕ και αναρτήστε τον ΑΜΑ σε κάθε αγγελία." });
  }
  if (tax.setting === "AUTO" && tax.propertiesWithAma === 2) {
    warnings.push({ level: "medium", title: "Με έναν ακόμη ΑΜΑ γίνεστε επιχείρηση", detail: "Από το 3ο ακίνητο με ΑΜΑ απαιτείται έναρξη εργασιών εντός 30 ημερών: ΦΠΑ 13%, τέλος παρεπιδημούντων 0,5%, myDATA." });
  }
  for (const s of stays.filter((x) => x.longStay && !x.complimentary && (x.status === "CONFIRMED" || x.status === "COMPLETED") && x.checkOut >= from)) {
    warnings.push({ level: "low", title: `${s.guestName}: διαμονή ${s.nights} νυχτών`, detail: "Διαμονές 60+ ημερών δεν είναι βραχυχρόνια μίσθωση — υποβάλλεται Δήλωση Πληροφοριακών Στοιχείων Μίσθωσης." });
  }

  return {
    today,
    regime: tax.regime,
    regimeSetting: tax.setting,
    propertiesWithAma: tax.propertiesWithAma,
    pendingDeclarations,
    monthly,
    compliance,
    warnings,
    totals: {
      declarationsOverdue: pendingDeclarations.filter((s) => s.declaration.overdue).length,
      declarationsDue: pendingDeclarations.length,
      climateFeeUnfiled: round2(monthly.filter((m) => m.closed && !m.climateFeeFiled).reduce((a, m) => a + m.climateFee, 0)),
    },
  };
}
export type TaxOverview = Awaited<ReturnType<typeof getTaxOverview>>;

// ─── Annual report (Ε2 for individuals / summary for business) ────────

export async function getAnnualReport(ctx: OrgContext, year: number, otherPropertyIncome = 0, now = new Date()) {
  const tax = await getTaxContext(ctx);
  const stays = (await listStays(ctx, { from: `${year}-01-01`, to: `${year + 1}-01-01` }, now)).filter(
    (s) => (s.status === "CONFIRMED" || s.status === "COMPLETED" || (s.status === "CANCELLED" && s.totalAmount > 0)) && !s.longStay,
  );
  const expenses = await db.transaction.groupBy({
    by: ["propertyId", "category"],
    where: { organizationId: ctx.organizationId, type: "EXPENSE", transactionDate: { gte: isoToDate(`${year}-01-01`), lt: isoToDate(`${year + 1}-01-01`) } },
    _sum: { amount: true },
  });

  const byProperty = tax.properties.map((p) => {
    const own = stays.filter((s) => s.propertyId === p.id);
    const gross = round2(own.reduce((a, s) => a + s.totalAmount, 0));
    const exp = expenses.filter((e) => e.propertyId === p.id);
    const platformFees = round2(exp.filter((e) => e.category === "PLATFORM_FEE").reduce((a, e) => a + toNumber(e._sum.amount), 0));
    const totalExpenses = round2(exp.reduce((a, e) => a + toNumber(e._sum.amount), 0));
    return {
      propertyId: p.id,
      name: p.name,
      ama: p.ama,
      stays: own.length,
      nights: own.reduce((a, s) => a + s.nights, 0),
      gross,
      rent: round2(own.reduce((a, s) => a + s.rent, 0)),
      vat: round2(own.reduce((a, s) => a + s.vat, 0)),
      presenceFee: round2(own.reduce((a, s) => a + s.presenceFee, 0)),
      climateFee: round2(own.reduce((a, s) => a + s.climateFee, 0)),
      platformFees,
      expenses: totalExpenses,
    };
  });

  const gross = round2(byProperty.reduce((a, p) => a + p.gross, 0));
  const individual = (() => {
    const deduction = round2(gross * FLAT_DEDUCTION_RATE);
    const taxable = round2(gross - deduction);
    return {
      gross,
      deduction,
      taxable,
      otherPropertyIncome,
      estimatedTax: rentalIncomeTax(year, taxable, otherPropertyIncome),
      scale: rentalScale(year).map((b) => ({ upTo: Number.isFinite(b.upTo) ? b.upTo : null, rate: b.rate })),
    };
  })();
  const profitBeforeTax = round2(byProperty.reduce((a, p) => a + p.rent - p.expenses, 0));
  const businessTax = tax.businessTaxRate != null ? round2((Math.max(0, profitBeforeTax) * tax.businessTaxRate) / 100) : businessIncomeTax(year, profitBeforeTax);
  const business = {
    revenueExVat: round2(byProperty.reduce((a, p) => a + p.rent, 0)),
    vat: round2(byProperty.reduce((a, p) => a + p.vat, 0)),
    presenceFee: round2(byProperty.reduce((a, p) => a + p.presenceFee, 0)),
    expenses: round2(byProperty.reduce((a, p) => a + p.expenses, 0)),
    profitBeforeTax,
    /** Estimate: own rate if set, else the business scale — without ΕΦΚΑ contributions. */
    estimatedTax: businessTax,
    taxRateSource: tax.businessTaxRate != null ? ("SETTING" as const) : ("SCALE" as const),
    profitAfterTax: round2(profitBeforeTax - businessTax),
  };
  const effectiveRate = (taxAmount: number, base: number) => (base > 0 ? Math.round((taxAmount / base) * 10_000) / 10_000 : 0);
  return {
    year,
    regime: tax.regime,
    /** Average income tax rate of the year, used to estimate the tax of each stay. */
    effectiveTaxRate:
      tax.regime === "BUSINESS"
        ? tax.businessTaxRate != null
          ? tax.businessTaxRate / 100
          : effectiveRate(businessTax, profitBeforeTax)
        : effectiveRate(individual.estimatedTax, individual.taxable),
    byProperty,
    climateFeeCollected: round2(byProperty.reduce((a, p) => a + p.climateFee, 0)),
    individual,
    business,
  };
}
export type AnnualReport = Awaited<ReturnType<typeof getAnnualReport>>;

// ─── CSV exports for the accountant ──────────────────────────────────

function csv(rows: (string | number | null)[][]) {
  const cell = (v: string | number | null) => {
    const s = v == null ? "" : typeof v === "number" ? v.toFixed(2).replace(/\.00$/, "") : v;
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM so Excel opens Greek text correctly.
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

export async function exportStaysCsv(ctx: OrgContext, year: number) {
  const stays = await listStays(ctx, { from: `${year}-01-01`, to: `${year + 1}-01-01` }, new Date(), (await getAnnualReport(ctx, year)).effectiveTaxRate);
  return csv([
    ["ΑΜΑ", "Ακίνητο", "Επισκέπτης", "Κωδικός κράτησης", "Πηγή", "Κατάσταση", "Άφιξη", "Αναχώρηση", "Νύχτες", "Τιμή δωματίου (€)", "Σύνολο επισκέπτη με ΤΑΚΚ", "Μίσθωμα χωρίς ΦΠΑ", "ΦΠΑ 13%", "Τέλος παρεπιδημούντων 0,5%", "ΤΑΚΚ", "ΤΑΚΚ ανά μήνα", "Προμήθεια", "Φόρος εισοδήματος (εκτίμηση)", "Καθαρά (εκτίμηση)", "Δήλωση διαμονής", "Προθεσμία δήλωσης"],
    ...stays.map((s) => [
      s.ama, s.propertyName, s.guestName, s.confirmationCode, label(s.source), label(s.status), s.checkIn, s.checkOut, s.nights, s.totalAmount, s.guestTotal, s.rent, s.vat, s.presenceFee, s.climateFee, s.climateFeeMonths.map((m) => `${m.period}: ${m.nights} νύχτες ${m.amount} €`).join(" | "), s.commission, s.incomeTax, s.net,
      label(s.declaration.required ? s.declaration.status : "NOT_REQUIRED"), s.declaration.required ? s.declaration.deadline : null,
    ]),
  ]);
}

export async function exportAnnualCsv(ctx: OrgContext, year: number) {
  const r = await getAnnualReport(ctx, year);
  return csv([
    ["Έτος", "Καθεστώς", "ΑΜΑ", "Ακίνητο", "Διαμονές", "Νύχτες", "Ακαθάριστα (€)", "Μίσθωμα χωρίς ΦΠΑ", "ΦΠΑ", "Τέλος παρεπιδημούντων", "ΤΑΚΚ που εισπράχθηκε", "Προμήθειες πλατφορμών", "Σύνολο εξόδων"],
    ...r.byProperty.map((p) => [year, label(r.regime), p.ama, p.name, p.stays, p.nights, p.gross, p.rent, p.vat, p.presenceFee, p.climateFee, p.platformFees, p.expenses]),
  ]);
}

/** Tax view of one reservation (reservation page). */
export async function getStayTax(ctx: OrgContext, reservationId: string, now = new Date()) {
  const { regime, commissionRates } = await getTaxContext(ctx);
  const r = await db.reservation.findFirst({ where: { id: reservationId, organizationId: ctx.organizationId }, include: stayInclude });
  if (!r) throw notFound("Reservation");
  const year = Number(dateToISO(r.checkOut).slice(0, 4));
  const { effectiveTaxRate } = await getAnnualReport(ctx, year, 0, now);
  const info = stayTaxInfo(r, regime, todayISO(now), effectiveTaxRate);
  return { regime, commissionRate: commissionRates[r.source] ?? 0, ...info, declarationForm: declarationForm(r, info) };
}
