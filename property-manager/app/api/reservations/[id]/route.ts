import { readJson, route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { getReservationDetails, updateReservation } from "@/lib/services/reservations";
import { getStayTax } from "@/lib/services/tax";

type P = { id: string };

/** Reservation with its tasks, messages and tax/AADE details. */
export const GET = route<P>(async (_req, { id }) => {
  const ctx = await requireOrganizationMember();
  const [details, tax] = await Promise.all([getReservationDetails(ctx, id), getStayTax(ctx, id)]);
  return { ...details, tax };
});

export const PATCH = route<P>(async (req, { id }) =>
  updateReservation(await requireOrganizationMember(), id, await readJson(req)),
);
