import { readJson, route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { getReservationDetails, updateReservation } from "@/lib/services/reservations";
import { listOpenConflicts } from "@/lib/services/calendar-conflicts";
import { getStayTax } from "@/lib/services/tax";

type P = { id: string };

/** Reservation with its tasks, messages, tax/AADE details and possible double bookings. */
export const GET = route<P>(async (_req, { id }) => {
  const ctx = await requireOrganizationMember();
  const [details, tax, conflicts] = await Promise.all([getReservationDetails(ctx, id), getStayTax(ctx, id), listOpenConflicts(ctx, { reservationId: id })]);
  return { ...details, tax, conflicts };
});

export const PATCH = route<P>(async (req, { id }) =>
  updateReservation(await requireOrganizationMember(), id, await readJson(req)),
);
