import { z } from "zod";
import { readJson, route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { publicPagesLink, rotatePublicLink, setDirectBooking } from "@/lib/services/guest-pages";

/** Links of the property's guest guide and booking page → { guidePath, bookingPath } */
export const POST = route<{ id: string }>(async (_req, { id }) => publicPagesLink(await requireOrganizationMember(), id));

/** { directBooking: boolean } turns the booking page on or off; { rotate: "guide" | "booking" } makes a new link. */
export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const body = z.union([z.object({ directBooking: z.boolean() }), z.object({ rotate: z.enum(["guide", "booking"]) })]).parse(await readJson(req));
  const ctx = await requireOrganizationMember();
  return "rotate" in body ? rotatePublicLink(ctx, id, body.rotate) : setDirectBooking(ctx, id, body.directBooking);
});
