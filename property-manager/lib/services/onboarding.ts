import { db } from "@/lib/db";
import type { OrgContext } from "@/lib/permissions";

/**
 * The first steps of a new account: a property, its reservations from a
 * Booking/Airbnb export file, and the platforms' calendars. Shown on the
 * dashboard until all are done.
 */
export async function getOnboarding(ctx: OrgContext) {
  const where = { organizationId: ctx.organizationId };
  const [properties, reservations, calendars] = await Promise.all([
    db.property.findMany({ where, select: { id: true, ama: true }, orderBy: { createdAt: "asc" } }),
    db.reservation.count({ where }),
    db.calendarFeed.count({ where }),
  ]);
  const steps = {
    property: properties.length > 0,
    reservations: reservations > 0,
    calendars: calendars > 0,
  };
  return {
    steps,
    complete: Object.values(steps).every(Boolean),
    /** Where to add the calendars: the first property. */
    firstPropertyId: properties[0]?.id ?? null,
  };
}
