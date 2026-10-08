import { beforeAll, describe, expect, it } from "vitest";
import type { OrgContext } from "@/lib/permissions";
import { addFeed } from "@/lib/services/calendar-feeds";
import { createReservation } from "@/lib/services/reservations";
import { getTaxContext, updateTaxSettings } from "@/lib/services/tax";
import { createGuest, createProperty, createTenant, resetDatabase } from "./helpers";

describe("booking sources beyond Booking.com and Airbnb", () => {
  let ctx: OrgContext;
  let propertyId: string;
  let guestId: string;

  beforeAll(async () => {
    await resetDatabase();
    ctx = await createTenant("Sources");
    propertyId = (await createProperty(ctx)).id;
    guestId = (await createGuest(ctx)).id;
  });

  it("saves one platform's commission at a time, keeping the others", async () => {
    await updateTaxSettings(ctx, { commissionRates: { VRBO: 8 } });
    await updateTaxSettings(ctx, { commissionRates: { EXPEDIA: 18 } });
    const { commissionRates } = await getTaxContext(ctx);
    expect(commissionRates).toMatchObject({ BOOKING_COM: 15, AIRBNB: 15, VRBO: 8, EXPEDIA: 18 });
    await expect(updateTaxSettings(ctx, { commissionRates: { MYSPACE: 5 } })).rejects.toMatchObject({ name: "ZodError" });
  });

  it("computes the commission of a Vrbo stay on the full room price", async () => {
    const r = await createReservation(ctx, { propertyId, guestId, guestsCount: 2, checkIn: "2026-09-01", checkOut: "2026-09-04", totalAmount: 300, source: "VRBO" });
    expect(r.source).toBe("VRBO");
    expect(Number(r.commission)).toBe(24);
    const agency = await createReservation(ctx, { propertyId, guestId, guestsCount: 2, checkIn: "2026-09-10", checkOut: "2026-09-12", totalAmount: 200, source: "TRAVEL_AGENCY" });
    expect(Number(agency.commission)).toBe(0); // no rate set yet
  });

  it("iCal calendars are only for platforms (not travel agencies)", async () => {
    await expect(addFeed(ctx, propertyId, { source: "TRAVEL_AGENCY", url: "https://example.com/a.ics" })).rejects.toMatchObject({ name: "ZodError" });
  });
});
