import { z } from "zod";
import { readJson, route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { publicPagesLink, setDirectBooking } from "@/lib/services/guest-pages";

/** Links of the property's guest guide and booking page → { guidePath, bookingPath } */
export const POST = route<{ id: string }>(async (_req, { id }) => publicPagesLink(await requireOrganizationMember(), id));

/** { directBooking: boolean } — turns the direct booking page on or off. */
export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const { directBooking } = z.object({ directBooking: z.boolean() }).parse(await readJson(req));
  return setDirectBooking(await requireOrganizationMember(), id, directBooking);
});
