import { z } from "zod";
import { currency, isoDate, money, optionalQuery, optionalText, positiveInt, requiredText } from "./common";

export const propertyStatus = z.enum(["ACTIVE", "INACTIVE"]);

/** Fields without defaults — updates must leave omitted fields untouched. */
const fields = z.object({
  name: requiredText("Όνομα", 120),
  description: optionalText(4000),
  address: optionalText(300),
  city: requiredText("Πόλη / περιοχή", 120),
  country: requiredText("Χώρα", 120),
  bedrooms: positiveInt("Υπνοδωμάτια", 50),
  bathrooms: positiveInt("Μπάνια", 50),
  maxGuests: positiveInt("Μέγιστοι επισκέπτες", 100).pipe(z.number().min(1, "Τουλάχιστον 1 επισκέπτης")),
  status: propertyStatus,
  basePrice: money,
  currency: currency.unwrap(),
  ama: optionalText(20).refine((v) => !v || /^\d{6,15}$/.test(v), "Ο ΑΜΑ είναι ο αριθμητικός κωδικός από το Μητρώο της ΑΑΔΕ"),
  kind: z.enum(["APARTMENT", "DETACHED_HOUSE"]),
  areaSqm: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().min(5).max(5000).nullable()).optional(),
  compliance: z
    .object({
      fireExtinguisher: z.boolean().optional(),
      smokeDetectors: z.boolean().optional(),
      firstAidKit: z.boolean().optional(),
      emergencyLighting: z.boolean().optional(),
      electricianDeclaration: z.boolean().optional(),
      amaDisplayed: z.boolean().optional(),
      insuranceExpiresOn: isoDate.nullish(),
    })
    .optional(),
});

export const propertyCreateSchema = fields.extend({
  bedrooms: fields.shape.bedrooms.default(1),
  bathrooms: fields.shape.bathrooms.default(1),
  maxGuests: fields.shape.maxGuests.default(2),
  status: propertyStatus.default("ACTIVE"),
  currency,
  kind: fields.shape.kind.default("APARTMENT"),
});

export const propertyUpdateSchema = fields.partial();

export const propertyListQuery = z.object({
  q: optionalQuery(z.string().trim().max(100)),
  status: optionalQuery(propertyStatus),
});

export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>;
export type PropertyUpdateInput = z.infer<typeof propertyUpdateSchema>;
export type PropertyListQuery = z.infer<typeof propertyListQuery>;
