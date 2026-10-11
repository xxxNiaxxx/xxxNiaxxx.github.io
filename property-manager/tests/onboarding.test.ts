import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import type { OrgContext } from "@/lib/permissions";
import { getOnboarding } from "@/lib/services/onboarding";
import { createReservation } from "@/lib/services/reservations";
import { createGuest, createTenant, resetDatabase } from "./helpers";

describe("first steps", () => {
  let ctx: OrgContext;
  beforeAll(async () => {
    await resetDatabase();
    ctx = await createTenant("Onboard");
  });

  it("ticks property, reservations and calendars as they are added", async () => {
    expect(await getOnboarding(ctx)).toEqual({ steps: { property: false, reservations: false, calendars: false }, complete: false, firstPropertyId: null });

    const property = await db.property.create({
      data: { organizationId: ctx.organizationId, name: "Serene", city: "Νέα Προποντίδα", country: "Ελλάδα", basePrice: 60, maxGuests: 2 },
    });
    let o = await getOnboarding(ctx);
    expect(o.steps).toEqual({ property: true, reservations: false, calendars: false });
    expect(o.firstPropertyId).toBe(property.id);

    const guest = await createGuest(ctx, "Anna", "Muller");
    await createReservation(ctx, { propertyId: property.id, guestId: guest.id, guestsCount: 1, checkIn: "2026-11-01", checkOut: "2026-11-03", totalAmount: 120, source: "BOOKING_COM" });
    await db.calendarFeed.create({ data: { organizationId: ctx.organizationId, propertyId: property.id, source: "AIRBNB", url: "https://www.airbnb.com/calendar/ical/1.ics" } });
    o = await getOnboarding(ctx);
    expect(o.steps).toEqual({ property: true, reservations: true, calendars: true });
    expect(o.complete).toBe(true);
  });
});
