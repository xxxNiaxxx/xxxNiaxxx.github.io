import { z } from "zod";
import { db } from "@/lib/db";
import { isoToDate } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { roomAndCommission, type AmountMode } from "@/lib/import/amounts";
import type { OrgContext } from "@/lib/permissions";
import { climateFeeForStay, type PropertyKind } from "@/lib/tax/gr";
import { isoDate } from "@/lib/validation/common";
import { reservationSource } from "@/lib/validation/reservation";
import { createReservation, updateReservation } from "./reservations";
import { getTaxContext } from "./tax";

const rowSchema = z.object({
  line: z.number().int(),
  externalId: z.string().trim().max(100).nullish(),
  propertyId: z.string().min(1),
  guestName: z.string().trim().min(1).max(160),
  email: z.string().trim().max(200).nullish(),
  phone: z.string().trim().max(40).nullish(),
  country: z.string().trim().max(80).nullish(),
  checkIn: isoDate,
  checkOut: isoDate,
  guestsCount: z.number().int().min(1).max(100),
  amount: z.number().min(0).max(10_000_000),
  commission: z.number().min(0).max(10_000_000).nullish(),
  commissionPercent: z.number().min(0).max(100).nullish(),
  status: z.enum(["CONFIRMED", "PENDING", "CANCELLED", "COMPLETED"]),
  notes: z.string().trim().max(4000).nullish(),
  /** Every column of the export row (header → text). */
  details: z.record(z.string().max(120), z.string().max(2000)).refine((d) => Object.keys(d).length <= 80).optional(),
});

export const importSchema = z.object({
  source: reservationSource,
  amountMode: z.enum(["COMMISSIONABLE", "GUEST_TOTAL", "ROOM", "PAYOUT"]),
  rows: z.array(rowSchema).min(1).max(2000),
});
export type ImportInput = z.infer<typeof importSchema>;

export type ImportResult = { line: number; outcome: "created" | "updated" | "error"; reservationId?: string; message?: string };

const errorMessage = (e: unknown) =>
  e instanceof AppError ? e.message : e instanceof z.ZodError ? (e.issues[0]?.message ?? "Μη έγκυρα στοιχεία") : "Δεν αποθηκεύτηκε";

/** "Maria Papadopoulou" → first/last name (single words keep a placeholder surname). */
function splitName(full: string) {
  const parts = full.replace(/\s+/g, " ").trim().split(" ");
  return parts.length > 1 ? { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1)! } : { firstName: parts[0], lastName: "—" };
}

async function findOrCreateGuest(ctx: OrgContext, row: z.infer<typeof rowSchema>) {
  const { firstName, lastName } = splitName(row.guestName);
  const email = row.email?.includes("@") ? row.email.toLowerCase() : null;
  const existing = await db.guest.findFirst({
    where: {
      organizationId: ctx.organizationId,
      OR: [
        ...(email ? [{ email }] : []),
        { firstName: { equals: firstName, mode: "insensitive" as const }, lastName: { equals: lastName, mode: "insensitive" as const } },
      ],
    },
  });
  if (existing) return existing.id;
  const guest = await db.guest.create({
    data: { organizationId: ctx.organizationId, firstName, lastName, email, phone: row.phone || null, country: row.country || null },
  });
  return guest.id;
}

/** Keeps the whole export row on the reservation and completes the guest's missing contact details. */
async function saveDetails(reservationId: string, source: string, row: z.infer<typeof rowSchema>) {
  const r = await db.reservation.update({
    where: { id: reservationId },
    data: row.details && Object.keys(row.details).length ? { platformDetails: { source, importedAt: new Date().toISOString(), fields: Object.entries(row.details) } } : {},
    include: { guest: true },
  });
  const email = row.email?.includes("@") ? row.email.toLowerCase() : null;
  const missing = {
    ...(!r.guest.phone && row.phone ? { phone: row.phone.slice(0, 40) } : {}),
    ...(!r.guest.email && email ? { email } : {}),
    ...(!r.guest.country && row.country ? { country: row.country } : {}),
  };
  if (Object.keys(missing).length) await db.guest.update({ where: { id: r.guestId }, data: missing });
}

/**
 * Imports reservations from a platform export. Rows with a booking number
 * update the reservation already imported (status, dates, amounts); every
 * row succeeds or fails on its own.
 */
export async function importReservations(ctx: OrgContext, input: unknown) {
  const data = importSchema.parse(input);
  const tax = await getTaxContext(ctx);
  const properties = new Map(
    (await db.property.findMany({ where: { organizationId: ctx.organizationId } })).map((p) => [p.id, p]),
  );
  const results: ImportResult[] = [];

  for (const row of data.rows) {
    try {
      const property = properties.get(row.propertyId);
      if (!property) throw new AppError("NOT_FOUND", "Το ακίνητο δεν βρέθηκε");
      const climateFee = climateFeeForStay({ checkIn: row.checkIn, checkOut: row.checkOut, totalAmount: Math.max(row.amount, 1) }, { kind: property.kind as PropertyKind, areaSqm: property.areaSqm });
      const rate = row.commissionPercent ?? tax.commissionRates[data.source] ?? 0;
      // A cancellation without commission was free: no rent, no declaration.
      const charged = row.status !== "CANCELLED" || (row.commission ?? 0) > 0;
      const { room, commission } = charged
        ? roomAndCommission(data.amountMode as AmountMode, row.amount, { commission: row.commission ?? null, climateFee, ratePercent: rate, source: data.source })
        : { room: 0, commission: 0 };
      const fields = {
        propertyId: row.propertyId,
        checkIn: row.checkIn,
        checkOut: row.checkOut,
        guestsCount: Math.min(row.guestsCount, property.maxGuests),
        totalAmount: room,
        commission,
        currency: property.currency,
        source: data.source,
        confirmationCode: row.externalId ?? undefined,
        status: row.status,
        ...(row.notes ? { notes: row.notes } : {}),
      };

      let existing = row.externalId
        ? await db.reservation.findFirst({ where: { organizationId: ctx.organizationId, source: data.source, externalId: row.externalId } })
        : null;
      // A reservation typed in by hand with the booking number as its code.
      if (!existing && row.externalId) {
        existing = await db.reservation.findFirst({
          where: { organizationId: ctx.organizationId, source: data.source, externalId: null, confirmationCode: row.externalId },
        });
      }
      // A stay that the iCal calendar created first (no booking number there): same property and dates.
      existing ??= await db.reservation.findFirst({
        where: {
          organizationId: ctx.organizationId, propertyId: row.propertyId, calendarFeedId: { not: null }, externalId: null,
          status: { not: "CANCELLED" }, checkIn: isoToDate(row.checkIn), checkOut: isoToDate(row.checkOut),
        },
      });
      if (existing) {
        // Calendar stays have a placeholder guest: put the real one.
        const guest = existing.calendarFeedId ? { guestId: await findOrCreateGuest(ctx, row) } : {};
        const updated = await updateReservation(ctx, existing.id, { ...fields, ...guest });
        if (row.externalId && !existing.externalId) await db.reservation.update({ where: { id: existing.id }, data: { externalId: row.externalId } });
        await saveDetails(existing.id, data.source, row);
        results.push({ line: row.line, outcome: "updated", reservationId: updated.id });
      } else {
        const guestId = await findOrCreateGuest(ctx, row);
        const created = await createReservation(ctx, { ...fields, guestId, externalId: row.externalId ?? undefined });
        await saveDetails(created.id, data.source, row);
        results.push({ line: row.line, outcome: "created", reservationId: created.id });
      }
    } catch (e) {
      results.push({ line: row.line, outcome: "error", message: errorMessage(e) });
    }
  }

  return {
    created: results.filter((r) => r.outcome === "created").length,
    updated: results.filter((r) => r.outcome === "updated").length,
    failed: results.filter((r) => r.outcome === "error").length,
    results,
  };
}
