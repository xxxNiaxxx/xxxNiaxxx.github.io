import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { draftGuestReply } from "@/lib/ai/reply";
import type { OrgContext } from "@/lib/permissions";
import { publicPagesLink, requestBooking, setDirectBooking } from "@/lib/services/guest-pages";
import { createReservation, updateReservation } from "@/lib/services/reservations";
import { savingsReport } from "@/lib/services/savings";
import { setStayDeclaration } from "@/lib/services/tax";
import { createGuest, createTenant, resetDatabase } from "./helpers";

const NOW = new Date("2026-10-08T09:00:00Z");

describe("what the app saved", () => {
  let ctx: OrgContext;

  beforeAll(async () => {
    await resetDatabase();
    ctx = await createTenant("Savings");
    const propertyId = (await db.property.create({ data: { organizationId: ctx.organizationId, name: "Loft", city: "X", country: "GR", basePrice: 100, maxGuests: 2 } })).id;
    const guest = await createGuest(ctx);
    const stay = await createReservation(ctx, { propertyId, guestId: guest.id, guestsCount: 1, checkIn: "2026-09-01", checkOut: "2026-09-04", totalAmount: 300, source: "AIRBNB" });
    await setStayDeclaration(ctx, stay.id, { status: "DECLARED" }); // declared 8/10, deadline 20/10
    await draftGuestReply(ctx, { reservationId: stay.id, guestMessage: "Where can we park?" }, null);
    await setDirectBooking(ctx, propertyId, true);
    const token = (await publicPagesLink(ctx, propertyId)).bookingPath.split("/").pop()!;
    const req = await requestBooking(token, { checkIn: "2026-10-20", checkOut: "2026-10-22", guestsCount: 1, name: "Ana Lopez", email: "ana@example.com" }, "https://app.test", NOW);
    await updateReservation(ctx, req.reservationId, { status: "CONFIRMED" });
  });

  it("adds up fines avoided, commission saved and time", async () => {
    const s = await savingsReport(ctx, NOW);
    expect(s).toMatchObject({ year: 2026, declarationsOnTime: 1, finesAvoided: 100, directBookings: 1, commissionSaved: 30, aiReplies: 1, doubleBookingsCaught: 0 });
    expect(s.hoursSaved).toBeGreaterThan(0);
  });
});
