import { z } from "zod";
import { GUEST_LANGUAGE_CODES } from "@/lib/i18n/guest-language";
import { optionalEmail, optionalQuery, optionalText, requiredText } from "./common";

export const guestCreateSchema = z.object({
  firstName: requiredText("Όνομα", 80),
  lastName: requiredText("Επώνυμο", 80),
  email: optionalEmail,
  phone: optionalText(40).refine((v) => !v || /^[+()\d\s.-]{5,40}$/.test(v), "Δώστε έγκυρο τηλέφωνο"),
  country: optionalText(80),
  /** "" = automatic (from the country) */
  language: z.preprocess((v) => (v === "" ? null : v), z.enum(GUEST_LANGUAGE_CODES).nullish()),
  notes: optionalText(4000),
});

export const guestUpdateSchema = guestCreateSchema.partial();

export const guestListQuery = z.object({
  q: optionalQuery(z.string().trim().max(100)),
});

export type GuestCreateInput = z.infer<typeof guestCreateSchema>;
export type GuestUpdateInput = z.infer<typeof guestUpdateSchema>;
