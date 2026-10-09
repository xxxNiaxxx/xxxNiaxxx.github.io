import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { hasRole, type OrgContext } from "@/lib/permissions";

/** Values that open public pages or bill the organization: never part of an export. */
const SECRET_FIELDS = new Set(["icalToken", "publicToken", "bookingToken", "checkinToken", "stripeCustomerId", "stripeSubscriptionId"]);

const clean = <T extends object>(rows: T[]) =>
  rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !SECRET_FIELDS.has(k))));

/**
 * Everything the organization has stored, as one JSON document (GDPR data
 * portability, and a copy to keep before leaving). Owners and administrators only.
 */
export async function exportOrganizationData(ctx: OrgContext, now = new Date()) {
  if (!hasRole(ctx, "ADMIN")) throw new AppError("FORBIDDEN", "Μόνο ο ιδιοκτήτης και οι διαχειριστές εξάγουν τα δεδομένα");
  const where = { organizationId: ctx.organizationId };
  const [organization, members, properties, guests, reservations, tasks, transactions, messages, taxFilings, calendarFeeds, knowledge] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: ctx.organizationId } }),
    db.organizationMember.findMany({ where, select: { role: true, createdAt: true, user: { select: { name: true, email: true } } } }),
    db.property.findMany({ where }),
    db.guest.findMany({ where }),
    db.reservation.findMany({ where }),
    db.task.findMany({ where }),
    db.transaction.findMany({ where }),
    db.message.findMany({ where }),
    db.taxFiling.findMany({ where }),
    db.calendarFeed.findMany({ where }),
    db.aIMemory.findMany({ where }),
  ]);
  return {
    exportedAt: now.toISOString(),
    organization: clean([organization])[0],
    members,
    properties: clean(properties),
    guests,
    reservations: clean(reservations),
    tasks,
    transactions,
    messages,
    taxFilings,
    calendarFeeds,
    knowledge,
  };
}
