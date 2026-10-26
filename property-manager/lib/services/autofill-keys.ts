import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import type { OrgContext } from "@/lib/permissions";
import { assertAccess } from "./billing";
import { declarationsToFill } from "./tax";

/*
 * Keys for the «Συμπλήρωση ΑΑΔΕ» bookmark. The bookmark runs on the AADE page,
 * where the app's sign-in cookie isn't sent, so it carries its own key. A key
 * can only read the stays waiting for a declaration of one organization; it
 * stops working when its user leaves the organization or signs out everywhere.
 */

const PREFIX = "afk_";
const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

/** A new key for the signed-in member's bookmark (shown once, only its hash is kept). */
export async function createAutofillKey(ctx: OrgContext) {
  const key = PREFIX + randomBytes(32).toString("base64url");
  await db.autofillKey.create({ data: { organizationId: ctx.organizationId, userId: ctx.userId, keyHash: hashKey(key) } });
  return { key };
}

/** Turns off every bookmark of the user (all organizations). */
export async function revokeAutofillKeys(userId: string) {
  const { count } = await db.autofillKey.deleteMany({ where: { userId } });
  return { revoked: count };
}

/** The member a bookmark key acts for, or UNAUTHORIZED. */
async function contextForKey(key: string | null | undefined, now: Date): Promise<OrgContext> {
  const unauthorized = new AppError("UNAUTHORIZED", "Ο σελιδοδείκτης δεν ισχύει πια· αντιγράψτε τον ξανά από το Βραχυχρόνια.ai.");
  if (!key || !key.startsWith(PREFIX) || key.length > 100) throw unauthorized;
  const row = await db.autofillKey.findUnique({ where: { keyHash: hashKey(key) } });
  if (!row) throw unauthorized;
  const member = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: row.organizationId, userId: row.userId } },
    select: { role: true },
  });
  if (!member) throw unauthorized;
  await assertAccess(row.organizationId, now);
  await db.autofillKey.update({ where: { id: row.id }, data: { lastUsedAt: now } });
  return { userId: row.userId, organizationId: row.organizationId, role: member.role };
}

/** The stays a bookmark key may fill in, or UNAUTHORIZED. */
export async function declarationsForKey(key: string | null | undefined, now = new Date()) {
  return declarationsToFill(await contextForKey(key, now), now);
}

/**
 * The extension saw the host submit the declaration on AADE: marks the stay
 * declared. Only a stay of the key's organization that still waits for a
 * declaration; a second call for the same stay changes nothing.
 */
export async function markDeclaredForKey(key: string | null | undefined, input: unknown, now = new Date()) {
  const ctx = await contextForKey(key, now);
  const { reservationId } = z.object({ reservationId: z.string().min(1).max(100) }).parse(input);
  const r = await db.reservation.findFirst({
    where: { id: reservationId, organizationId: ctx.organizationId },
    select: { declarationStatus: true },
  });
  if (!r) throw notFound("Reservation");
  if (r.declarationStatus === "PENDING") {
    await db.reservation.update({ where: { id: reservationId }, data: { declarationStatus: "DECLARED", declaredAt: now } });
  }
  return { reservationId, status: r.declarationStatus === "PENDING" ? "DECLARED" : r.declarationStatus };
}
