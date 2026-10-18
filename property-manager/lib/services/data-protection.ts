import { Prisma } from "@prisma/client";
import { currentKeyId, decryptField, decryptJson } from "@/lib/crypto/fields";
import { db } from "@/lib/db";

/** The ID/passport number is deleted this many days after check-out, once nothing needs it. */
export const ID_RETENTION_DAYS = 30;

/**
 * Daily: encrypts guest data still stored in the clear (from before encryption)
 * or with an older key, and fills in the email/phone hashes. Reads raw rows,
 * since reads through `db` are already decrypted; writing back through `db`
 * encrypts with the current key.
 */
export async function reencryptGuestData(batch = 500) {
  const current = `enc:v1:${currentKeyId()}:%`;
  let guests = 0;
  let reservations = 0;
  for (;;) {
    const rows = await db.$queryRaw<{ id: string; email: string | null; phone: string | null; idNumber: string | null; notes: string | null }[]>`
      SELECT id, email, phone, "idNumber", notes FROM "Guest"
      WHERE (email IS NOT NULL AND email NOT LIKE ${current}) OR (phone IS NOT NULL AND phone NOT LIKE ${current})
         OR ("idNumber" IS NOT NULL AND "idNumber" NOT LIKE ${current}) OR (notes IS NOT NULL AND notes NOT LIKE ${current})
      LIMIT ${batch}`;
    for (const g of rows) {
      await db.guest.update({
        where: { id: g.id },
        data: { email: decryptField(g.email), phone: decryptField(g.phone), idNumber: decryptField(g.idNumber), notes: decryptField(g.notes) },
      });
    }
    guests += rows.length;
    if (rows.length < batch) break;
  }
  for (;;) {
    const rows = await db.$queryRaw<{ id: string; platformDetails: unknown }[]>`
      SELECT id, "platformDetails" FROM "Reservation"
      WHERE "platformDetails" IS NOT NULL AND jsonb_typeof("platformDetails") <> 'null'
        AND COALESCE("platformDetails"->>'$enc', '') NOT LIKE ${current}
      LIMIT ${batch}`;
    for (const r of rows) {
      const value = decryptJson(r.platformDetails);
      await db.reservation.update({ where: { id: r.id }, data: { platformDetails: value === null ? Prisma.DbNull : (value as Prisma.InputJsonValue) } });
    }
    reservations += rows.length;
    if (rows.length < batch) break;
  }
  return { guests, reservations };
}

/**
 * Daily: deletes the ID/passport number of guests whose stays no longer need
 * it: every stay ended over ID_RETENTION_DAYS ago and is declared to AADE,
 * not required, free, or cancelled without charge. What is not kept cannot leak.
 */
export async function purgeOldIdNumbers(now = new Date()) {
  const cutoff = new Date(now.getTime() - ID_RETENTION_DAYS * 86_400_000);
  const { count } = await db.guest.updateMany({
    where: {
      idNumber: { not: null },
      // Not just entered (e.g. a guest saved before the reservation).
      updatedAt: { lt: cutoff },
      AND: [
        { reservations: { some: {} } },
        {
          reservations: {
            none: {
              OR: [
                { checkOut: { gte: cutoff } },
                { declarationStatus: "PENDING", complimentary: false, NOT: { status: "CANCELLED", totalAmount: 0 } },
              ],
            },
          },
        },
      ],
    },
    data: { idNumber: null },
  });
  return { cleared: count };
}
