import type { Reservation, TransactionCategory } from "@prisma/client";
import { db } from "@/lib/db";
import { dateToISO, diffDaysISO, isoToDate, monthRange, overlapNights, todayISO } from "@/lib/dates";
import type { OrgContext } from "@/lib/permissions";
import { AppError, notFound } from "@/lib/errors";
import { transactionCreateSchema, type RevenueQuery } from "@/lib/validation/financial";
import { assertProperty, assertReservation, type Tx } from "./scope";
import { serializeTransaction, toNumber } from "./serializers";

const BOOKED = ["CONFIRMED", "COMPLETED"] as const;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Keeps the transactions of a reservation in line with it: booked stays have
 * one BOOKING income and, when a platform commission is set, one PLATFORM_FEE
 * expense; pending/cancelled stays and free stays have none.
 */
export async function syncBookingIncome(client: Tx, r: Reservation) {
  const booked = (BOOKED as readonly string[]).includes(r.status) && !r.complimentary;
  const label = r.confirmationCode ?? "";
  await syncLinked(client, r, { type: "INCOME", category: "BOOKING", amount: booked ? toNumber(r.totalAmount) : 0, description: `Κράτηση ${label}`.trim() });
  await syncLinked(client, r, { type: "EXPENSE", category: "PLATFORM_FEE", amount: booked ? toNumber(r.commission) : 0, description: `Προμήθεια κράτησης ${label}`.trim() });
}

async function syncLinked(
  client: Tx,
  r: Reservation,
  t: { type: "INCOME" | "EXPENSE"; category: TransactionCategory; amount: number; description: string },
) {
  const existing = await client.transaction.findFirst({
    where: { reservationId: r.id, type: t.type, category: t.category, organizationId: r.organizationId },
  });
  if (t.amount <= 0) {
    if (existing) await client.transaction.delete({ where: { id: existing.id } });
    return;
  }
  const data = { propertyId: r.propertyId, amount: t.amount, currency: r.currency, transactionDate: r.checkIn, description: t.description };
  if (existing) await client.transaction.update({ where: { id: existing.id }, data });
  else await client.transaction.create({ data: { ...data, organizationId: r.organizationId, reservationId: r.id, type: t.type, category: t.category } });
}

/** Booked nights / available nights of active properties in [from, to). */
export async function getOccupancy(ctx: OrgContext, from: string, to: string, propertyId?: string) {
  const days = Math.max(0, diffDaysISO(from, to));
  const properties = await db.property.findMany({
    where: { organizationId: ctx.organizationId, status: "ACTIVE", ...(propertyId ? { id: propertyId } : {}) },
    select: { id: true },
  });
  const reservations = await db.reservation.findMany({
    where: {
      organizationId: ctx.organizationId,
      status: { in: [...BOOKED] },
      propertyId: { in: properties.map((p) => p.id) },
      checkIn: { lt: isoToDate(to) },
      checkOut: { gt: isoToDate(from) },
    },
    select: { propertyId: true, checkIn: true, checkOut: true },
  });
  const nightsByProperty = new Map<string, number>();
  for (const r of reservations) {
    const n = overlapNights(dateToISO(r.checkIn), dateToISO(r.checkOut), from, to);
    nightsByProperty.set(r.propertyId, (nightsByProperty.get(r.propertyId) ?? 0) + n);
  }
  const bookedNights = [...nightsByProperty.values()].reduce((a, b) => a + b, 0);
  const availableNights = properties.length * days;
  return {
    bookedNights,
    availableNights,
    rate: availableNights === 0 ? 0 : Math.min(1, bookedNights / availableNights),
    nightsByProperty,
    days,
  };
}

function resolveRange(query: RevenueQuery, now: Date) {
  if (query.from && query.to) return { from: query.from, to: query.to };
  const month = monthRange(todayISO(now));
  return { from: query.from ?? month.from, to: query.to ?? month.to };
}

export async function getRevenueSummary(ctx: OrgContext, query: RevenueQuery = {}, now: Date = new Date()) {
  const { from, to } = resolveRange(query, now);
  if (query.propertyId) await assertProperty(ctx, query.propertyId);

  const [transactions, properties, occupancy] = await Promise.all([
    db.transaction.findMany({
      where: {
        organizationId: ctx.organizationId,
        transactionDate: { gte: isoToDate(from), lt: isoToDate(to) },
        ...(query.propertyId ? { propertyId: query.propertyId } : {}),
      },
      select: { propertyId: true, type: true, category: true, amount: true, currency: true },
    }),
    db.property.findMany({
      where: { organizationId: ctx.organizationId, ...(query.propertyId ? { id: query.propertyId } : {}) },
      select: { id: true, name: true, status: true, currency: true },
      orderBy: { name: "asc" },
    }),
    getOccupancy(ctx, from, to, query.propertyId),
  ]);

  const byProperty = new Map(
    properties.map((p) => [p.id, { propertyId: p.id, name: p.name, status: p.status, income: 0, expenses: 0 }]),
  );
  const byCategory = new Map<TransactionCategory, { income: number; expenses: number }>();
  let income = 0;
  let expenses = 0;
  for (const t of transactions) {
    const amount = toNumber(t.amount);
    const row = byProperty.get(t.propertyId);
    const cat = byCategory.get(t.category) ?? { income: 0, expenses: 0 };
    if (t.type === "INCOME") {
      income += amount;
      cat.income += amount;
      if (row) row.income += amount;
    } else {
      expenses += amount;
      cat.expenses += amount;
      if (row) row.expenses += amount;
    }
    byCategory.set(t.category, cat);
  }

  const propertyRows = [...byProperty.values()]
    .map((p) => {
      const nights = occupancy.nightsByProperty.get(p.propertyId) ?? 0;
      return {
        ...p,
        income: round2(p.income),
        expenses: round2(p.expenses),
        net: round2(p.income - p.expenses),
        bookedNights: nights,
        occupancy: p.status === "ACTIVE" && occupancy.days > 0 ? Math.min(1, nights / occupancy.days) : 0,
      };
    })
    .sort((a, b) => b.net - a.net);

  return {
    from,
    to,
    currency: properties[0]?.currency ?? "EUR",
    income: round2(income),
    expenses: round2(expenses),
    net: round2(income - expenses),
    occupancy: occupancy.rate,
    bookedNights: occupancy.bookedNights,
    availableNights: occupancy.availableNights,
    byProperty: propertyRows,
    byCategory: [...byCategory.entries()].map(([category, v]) => ({
      category,
      income: round2(v.income),
      expenses: round2(v.expenses),
    })),
  };
}
export type RevenueSummary = Awaited<ReturnType<typeof getRevenueSummary>>;

export async function listTransactions(ctx: OrgContext, query: RevenueQuery = {}, now: Date = new Date()) {
  const { from, to } = resolveRange(query, now);
  const rows = await db.transaction.findMany({
    where: {
      organizationId: ctx.organizationId,
      transactionDate: { gte: isoToDate(from), lt: isoToDate(to) },
      ...(query.propertyId ? { propertyId: query.propertyId } : {}),
    },
    include: { property: { select: { name: true } } },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    take: 500,
  });
  return rows.map(serializeTransaction);
}

export async function createTransaction(ctx: OrgContext, input: unknown) {
  const data = transactionCreateSchema.parse(input);
  await assertProperty(ctx, data.propertyId);
  if (data.reservationId) await assertReservation(ctx, data.reservationId);
  const row = await db.transaction.create({
    data: {
      ...data,
      transactionDate: isoToDate(data.transactionDate),
      organizationId: ctx.organizationId,
    },
    include: { property: { select: { name: true } } },
  });
  return serializeTransaction(row);
}

export async function deleteTransaction(ctx: OrgContext, id: string) {
  const row = await db.transaction.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!row) throw notFound("Transaction");
  if (row.reservationId && row.category === "BOOKING" && row.type === "INCOME") {
    throw new AppError(
      "CONFLICT",
      "Τα έσοδα κράτησης ακολουθούν την κράτηση. Επεξεργαστείτε ή ακυρώστε την κράτηση.",
    );
  }
  await db.transaction.delete({ where: { id } });
}
