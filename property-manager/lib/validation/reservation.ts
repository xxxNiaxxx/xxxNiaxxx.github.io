import { z } from "zod";
import { currency, id, isoDate, money, optionalQuery, optionalText } from "./common";
import { guestCreateSchema } from "./guest";

export const reservationSource = z.enum(["MANUAL", "AIRBNB", "BOOKING_COM", "DIRECT", "OTHER"]);
export const reservationStatus = z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]);

const checkOutAfterCheckIn = {
  message: "Η αναχώρηση πρέπει να είναι μετά την άφιξη",
  path: ["checkOut"],
};

/** Fields without defaults — updates must leave omitted fields untouched. */
const fields = z.object({
  propertyId: id,
  checkIn: isoDate,
  checkOut: isoDate,
  guestsCount: z.coerce.number().int().min(1, "Τουλάχιστον 1 επισκέπτης").max(100),
  totalAmount: money,
  currency: currency.unwrap(),
  source: reservationSource,
  confirmationCode: optionalText(60),
  status: reservationStatus,
  notes: optionalText(4000),
  /** Free stay for relatives/friends: no rent, so no income tax, ΤΑΚΚ or AADE declaration. */
  complimentary: z.boolean(),
  /** Platform commission in €; omitted on create = computed from the source's rate. */
  commission: money,
  /** The amount is the guest's total including ΤΑΚΚ (Booking's "Συνολική τιμή κράτησης"); the ΤΑΚΚ is subtracted. */
  amountIncludesClimateFee: z.boolean(),
});

const base = fields.extend({
  currency,
  source: reservationSource.default("MANUAL"),
  status: reservationStatus.default("CONFIRMED"),
  complimentary: z.boolean().default(false),
  commission: money.optional(),
  amountIncludesClimateFee: z.boolean().default(false),
});

export const freeStayHasNoRent = {
  message: "Η δωρεάν φιλοξενία δεν έχει ενοίκιο — το ποσό πρέπει να είναι 0",
  path: ["totalAmount"],
};

/** Either an existing guestId or a new guest to create alongside. */
export const reservationCreateSchema = base
  .extend({
    guestId: id.optional(),
    newGuest: guestCreateSchema.optional(),
  })
  .refine((v) => v.checkOut > v.checkIn, checkOutAfterCheckIn)
  .refine((v) => !v.complimentary || v.totalAmount === 0, freeStayHasNoRent)
  .refine((v) => Boolean(v.guestId) !== Boolean(v.newGuest), {
    message: "Επιλέξτε υπάρχοντα επισκέπτη ή καταχωρίστε νέο",
    path: ["guestId"],
  });

export const reservationUpdateSchema = fields
  .extend({ guestId: id })
  .partial()
  .refine((v) => !v.checkIn || !v.checkOut || v.checkOut > v.checkIn, checkOutAfterCheckIn)
  .refine((v) => !v.complimentary || v.totalAmount === undefined || v.totalAmount === 0, freeStayHasNoRent);

export const reservationListQuery = z.object({
  q: optionalQuery(z.string().trim().max(100)),
  status: optionalQuery(reservationStatus),
  propertyId: optionalQuery(id),
  guestId: optionalQuery(id),
  from: optionalQuery(isoDate),
  to: optionalQuery(isoDate),
});

export type ReservationCreateInput = z.infer<typeof reservationCreateSchema>;
export type ReservationUpdateInput = z.infer<typeof reservationUpdateSchema>;
export type ReservationListQuery = z.infer<typeof reservationListQuery>;
