import { z } from "zod";
import { currency, money, optionalQuery, optionalText, positiveInt, requiredText } from "./common";

export const propertyStatus = z.enum(["ACTIVE", "INACTIVE"]);

export const propertyCreateSchema = z.object({
  name: requiredText("Name", 120),
  description: optionalText(4000),
  address: optionalText(300),
  city: requiredText("City", 120),
  country: requiredText("Country", 120),
  bedrooms: positiveInt("Bedrooms", 50).default(1),
  bathrooms: positiveInt("Bathrooms", 50).default(1),
  maxGuests: positiveInt("Max guests", 100).pipe(z.number().min(1, "At least 1 guest")).default(2),
  status: propertyStatus.default("ACTIVE"),
  basePrice: money,
  currency,
});

export const propertyUpdateSchema = propertyCreateSchema.partial();

export const propertyListQuery = z.object({
  q: optionalQuery(z.string().trim().max(100)),
  status: optionalQuery(propertyStatus),
});

export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>;
export type PropertyUpdateInput = z.infer<typeof propertyUpdateSchema>;
export type PropertyListQuery = z.infer<typeof propertyListQuery>;
