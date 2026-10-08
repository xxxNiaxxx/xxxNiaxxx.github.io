import { readJson, route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { getReservationDetails, updateReservation } from "@/lib/services/reservations";

type P = { id: string };

export const GET = route<P>(async (_req, { id }) => getReservationDetails(await requireOrganizationMember(), id));

export const PATCH = route<P>(async (req, { id }) =>
  updateReservation(await requireOrganizationMember(), id, await readJson(req)),
);
