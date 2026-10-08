import { z } from "zod";
import { isISODate } from "@/lib/dates";

export const id = z.string().trim().min(1, "Required").max(64);

export const isoDate = z
  .string()
  .trim()
  .refine(isISODate, { message: "Use a valid date (YYYY-MM-DD)" });

export const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullish();

export const requiredText = (label: string, max = 200) =>
  z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`).max(max);

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address" }));

export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.email({ error: "Enter a valid email address" }).nullable())
  .nullish();

export const money = z.coerce
  .number({ error: "Enter an amount" })
  .finite()
  .min(0, "Amount cannot be negative")
  .max(10_000_000, "Amount is too large")
  .transform((v) => Math.round(v * 100) / 100);

export const currency = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code")
  .default("EUR");

export const positiveInt = (label: string, max = 100) =>
  z.coerce.number({ error: `${label} must be a number` }).int().min(0).max(max);

/** Query-string helper: "" and missing both mean "not set". */
export const optionalQuery = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" || v === "all" ? undefined : v), schema.optional());
