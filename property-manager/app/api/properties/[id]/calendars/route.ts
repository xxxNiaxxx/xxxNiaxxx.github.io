import { created, readJson, route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { addFeed, getPropertyCalendars } from "@/lib/services/calendar-feeds";

type P = { id: string };

/** iCal feeds imported for the property and its own export link. */
export const GET = route<P>(async (_req, { id }) => getPropertyCalendars(await requireOrganizationMember(), id));

/** { source: "AIRBNB" | "BOOKING_COM" | "OTHER", url } — added and synced right away. */
export const POST = route<P>(async (req, { id }) => created(await addFeed(await requireOrganizationMember(), id, await readJson(req))));
