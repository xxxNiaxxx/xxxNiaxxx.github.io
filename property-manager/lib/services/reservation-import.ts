import { z } from "zod";
import { db } from "@/lib/db";
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
});

export const importSchema = z.object({
  source: reservationSource,
  amountMode: z.enum(["GUEST_TOTAL", "ROOM", "PAYOUT"]),
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
        ? roomAndCommission(data.amountMode as AmountMode, row.amount, { commission: row.commission ?? null, climateFee, ratePercent: rate, regime: tax.regime })
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

      const existing = row.externalId
        ? await db.reservation.findFirst({ where: { organizationId: ctx.organizationId, source: data.source, externalId: row.externalId } })
        : null;
      if (existing) {
        const updated = await updateReservation(ctx, existing.id, fields);
        results.push({ line: row.line, outcome: "updated", reservationId: updated.id });
      } else {
        const guestId = await findOrCreateGuest(ctx, row);
        const created = await createReservation(ctx, { ...fields, guestId, externalId: row.externalId ?? undefined });
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
