import { z } from "zod";
import { isISODate } from "@/lib/dates";

export const id = z.string().trim().min(1, "Υποχρεωτικό").max(64);

export const isoDate = z
  .string()
  .trim()
  .refine(isISODate, { message: "Δώστε έγκυρη ημερομηνία (ΕΕΕΕ-ΜΜ-ΗΗ)" });

export const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullish();

export const requiredText = (label: string, max = 200) =>
  z.string({ error: `Το πεδίο «${label}» είναι υποχρεωτικό` }).trim().min(1, `Το πεδίο «${label}» είναι υποχρεωτικό`).max(max);

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Δώστε έγκυρο email" }));

export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.email({ error: "Δώστε έγκυρο email" }).nullable())
  .nullish();

export const money = z.coerce
  .number({ error: "Δώστε ποσό" })
  .finite()
  .min(0, "Το ποσό δεν μπορεί να είναι αρνητικό")
  .max(10_000_000, "Το ποσό είναι πολύ μεγάλο")
  .transform((v) => Math.round(v * 100) / 100);

export const currency = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Δώστε κωδικό νομίσματος 3 γραμμάτων")
  .default("EUR");

export const positiveInt = (label: string, max = 100) =>
  z.coerce.number({ error: `Το πεδίο «${label}» πρέπει να είναι αριθμός` }).int().min(0).max(max);

/** Query-string helper: "" and missing both mean "not set". */
export const optionalQuery = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" || v === "all" ? undefined : v), schema.optional());
