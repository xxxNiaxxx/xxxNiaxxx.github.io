import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError, conflict, notFound } from "@/lib/errors";
import { hasRole, type OrgContext } from "@/lib/permissions";
import { email } from "@/lib/validation/common";
import { assertNotDemo } from "@/lib/demo";

export const INVITATION_DAYS = 7;

export const invitableRole = z.enum(["ADMIN", "MEMBER"]);
const inviteSchema = z.object({ email, role: invitableRole.default("MEMBER") });

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Path of the page that accepts an invitation; the client prefixes its own origin. */
export const invitationPath = (token: string) => `/invite/${token}`;

function assertCanInvite(ctx: OrgContext, role: "ADMIN" | "MEMBER") {
  if (!hasRole(ctx, "ADMIN")) throw new AppError("FORBIDDEN", "Μόνο ο ιδιοκτήτης και οι διαχειριστές προσκαλούν μέλη");
  if (role === "ADMIN" && ctx.role !== "OWNER") throw new AppError("FORBIDDEN", "Μόνο ο ιδιοκτήτης ορίζει διαχειριστές");
}

type InvitationRow = Prisma.InvitationGetPayload<{ include: { invitedBy: { select: { name: true; email: true } } } }>;

function serializeInvitation(i: InvitationRow) {
  return {
    id: i.id,
    email: i.email,
    role: i.role,
    invitedByName: i.invitedBy ? (i.invitedBy.name ?? i.invitedBy.email) : null,
    expiresAt: i.expiresAt.toISOString(),
    createdAt: i.createdAt.toISOString(),
  };
}
export type InvitationDTO = ReturnType<typeof serializeInvitation>;

/**
 * Creates an invitation link. Inviting the same email again replaces the
 * previous link, so this also serves as "send a new link".
 */
export async function createInvitation(ctx: OrgContext, input: unknown, now = new Date()) {
  const data = inviteSchema.parse(input);
  assertCanInvite(ctx, data.role);
  assertNotDemo((await db.user.findUnique({ where: { id: ctx.userId }, select: { email: true } }))?.email);
  const member = await db.organizationMember.findFirst({
    where: { organizationId: ctx.organizationId, user: { email: data.email } },
  });
  if (member) throw conflict(`Το ${data.email} είναι ήδη μέλος της ομάδας`);

  const token = randomBytes(24).toString("base64url");
  const invitation = await db.$transaction(async (tx) => {
    await tx.invitation.updateMany({
      where: { organizationId: ctx.organizationId, email: data.email, acceptedAt: null, revokedAt: null },
      data: { revokedAt: now },
    });
    return tx.invitation.create({
      data: {
        organizationId: ctx.organizationId,
        email: data.email,
        role: data.role,
        tokenHash: hashToken(token),
        invitedByUserId: ctx.userId,
        expiresAt: new Date(now.getTime() + INVITATION_DAYS * 86_400_000),
      },
      include: { invitedBy: { select: { name: true, email: true } } },
    });
  });
  return { invitation: serializeInvitation(invitation), token, path: invitationPath(token) };
}

/** Invitations that can still be accepted. */
export async function listInvitations(ctx: OrgContext, now = new Date()) {
  if (!hasRole(ctx, "ADMIN")) return [];
  const rows = await db.invitation.findMany({
    where: { organizationId: ctx.organizationId, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
    include: { invitedBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(serializeInvitation);
}

export async function revokeInvitation(ctx: OrgContext, id: string, now = new Date()) {
  if (!hasRole(ctx, "ADMIN")) throw new AppError("FORBIDDEN", "Μόνο ο ιδιοκτήτης και οι διαχειριστές ακυρώνουν προσκλήσεις");
  const invitation = await db.invitation.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!invitation) throw notFound("Invitation");
  await db.invitation.update({ where: { id }, data: { revokedAt: invitation.revokedAt ?? now } });
}

export type InvitationStatus = "VALID" | "EXPIRED" | "ACCEPTED" | "REVOKED";

/** Public details shown on the invitation page, or null for an unknown link. */
export async function getInvitationByToken(token: string, now = new Date()) {
  const i = await db.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { organization: { select: { name: true } }, invitedBy: { select: { name: true, email: true } } },
  });
  if (!i) return null;
  const status: InvitationStatus = i.revokedAt ? "REVOKED" : i.acceptedAt ? "ACCEPTED" : i.expiresAt <= now ? "EXPIRED" : "VALID";
  return {
    organizationName: i.organization.name,
    invitedByName: i.invitedBy ? (i.invitedBy.name ?? i.invitedBy.email) : null,
    email: i.email,
    role: i.role,
    status,
  };
}

const STATUS_ERRORS: Record<Exclude<InvitationStatus, "VALID">, string> = {
  EXPIRED: "Η πρόσκληση έχει λήξει. Ζητήστε νέο σύνδεσμο.",
  ACCEPTED: "Η πρόσκληση έχει ήδη χρησιμοποιηθεί.",
  REVOKED: "Η πρόσκληση ακυρώθηκε. Ζητήστε νέο σύνδεσμο.",
};

/**
 * Adds the user to the invitation's organization. The account email must
 * match the invited email, so a forwarded link cannot be used by someone else.
 */
export async function acceptInvitation(
  tx: Prisma.TransactionClient,
  user: { id: string; email: string },
  token: string,
  now = new Date(),
) {
  const i = await tx.invitation.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!i) throw notFound("Invitation");
  const status: InvitationStatus = i.revokedAt ? "REVOKED" : i.acceptedAt ? "ACCEPTED" : i.expiresAt <= now ? "EXPIRED" : "VALID";
  if (status !== "VALID") throw new AppError("BAD_REQUEST", STATUS_ERRORS[status]);
  if (user.email.toLowerCase() !== i.email) {
    throw new AppError("FORBIDDEN", `Η πρόσκληση είναι για το ${i.email}. Συνδεθείτε με αυτό το email.`);
  }
  // Guards against the same link being accepted twice concurrently.
  const claimed = await tx.invitation.updateMany({
    where: { id: i.id, acceptedAt: null, revokedAt: null },
    data: { acceptedAt: now, acceptedByUserId: user.id },
  });
  if (claimed.count === 0) throw new AppError("BAD_REQUEST", STATUS_ERRORS.ACCEPTED);
  const existing = await tx.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: i.organizationId, userId: user.id } },
  });
  if (!existing) {
    await tx.organizationMember.create({ data: { organizationId: i.organizationId, userId: user.id, role: i.role } });
  }
  return { organizationId: i.organizationId };
}

export async function acceptInvitationForUser(user: { id: string; email: string }, token: string, now = new Date()) {
  return db.$transaction((tx) => acceptInvitation(tx, user, token, now));
}
