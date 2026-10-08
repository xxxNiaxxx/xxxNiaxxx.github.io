import { route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { cancelReservation } from "@/lib/services/reservations";

export const POST = route<{ id: string }>(async (_req, { id }) => cancelReservation(await requireOrganizationMember(), id));
