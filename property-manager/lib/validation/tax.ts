import { z } from "zod";

export const yearQuery = z.object({
  year: z.coerce.number().int().min(2018).max(2100),
  otherIncome: z.coerce.number().min(0).max(100_000_000).default(0),
});
