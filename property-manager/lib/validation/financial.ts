import { z } from "zod";
import { currency, id, isoDate, money, optionalQuery, optionalText } from "./common";

export const transactionType = z.enum(["INCOME", "EXPENSE"]);
export const transactionCategory = z.enum([
  "BOOKING",
  "CLEANING",
  "MAINTENANCE",
  "UTILITIES",
  "SUPPLIES",
  "PLATFORM_FEE",
  "OTHER",
]);

export const transactionCreateSchema = z.object({
  propertyId: id,
  reservationId: id.nullish(),
  type: transactionType,
  category: transactionCategory,
  amount: money.pipe(z.number().positive("Το ποσό πρέπει να είναι μεγαλύτερο από μηδέν")),
  currency,
  description: optionalText(500),
  transactionDate: isoDate,
});

export const revenueQuery = z
  .object({
    from: optionalQuery(isoDate),
    to: optionalQuery(isoDate),
    propertyId: optionalQuery(id),
  })
  .refine((v) => !v.from || !v.to || v.to > v.from, { message: "Η ημερομηνία λήξης πρέπει να είναι μετά την έναρξη", path: ["to"] });

export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
export type RevenueQuery = z.infer<typeof revenueQuery>;
