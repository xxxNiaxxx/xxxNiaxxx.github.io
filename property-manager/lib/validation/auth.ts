import { z } from "zod";
import { email, requiredText } from "./common";

export const registerSchema = z.object({
  name: requiredText("Name", 100),
  email,
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  organizationName: requiredText("Organization name", 120),
});

export type RegisterInput = z.infer<typeof registerSchema>;
