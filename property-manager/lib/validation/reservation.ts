import { z } from "zod";
import { currency, id, isoDate, money, optionalQuery, optionalText } from "./common";
import { guestCreateSchema } from "./guest";

export const reservationSource = z.enum(["MANUAL", "AIRBNB", "BOOKING_COM", "DIRECT", "OTHER"]);
export const reservationStatus = z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]);

const checkOutAfterCheckIn = {
  message: "Check-out must be after check-in",
  path: ["checkOut"],
};

const base = z.object({
  propertyId: id,
  checkIn: isoDate,
  checkOut: isoDate,
  guestsCount: z.coerce.number().int().min(1, "At least 1 guest").max(100),
  totalAmount: money,
  currency,
  source: reservationSource.default("MANUAL"),
  confirmationCode: optionalText(60),
  status: reservationStatus.default("CONFIRMED"),
  notes: optionalText(4000),
});

/** Either an existing guestId or a new guest to create alongside. */
export const reservationCreateSchema = base
  .extend({
    guestId: id.optional(),
    newGuest: guestCreateSchema.optional(),
  })
  .refine((v) => v.checkOut > v.checkIn, checkOutAfterCheckIn)
  .refine((v) => Boolean(v.guestId) !== Boolean(v.newGuest), {
    message: "Select an existing guest or enter a new one",
    path: ["guestId"],
  });

export const reservationUpdateSchema = base
  .extend({ guestId: id })
  .partial()
  .refine((v) => !v.checkIn || !v.checkOut || v.checkOut > v.checkIn, checkOutAfterCheckIn);

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
