import { z } from "zod";
import { email, requiredText } from "./common";

export const registerSchema = z.object({
  name: requiredText("Ονοματεπώνυμο", 100),
  email,
  password: z.string().min(8, "Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες").max(200),
  organizationName: requiredText("Όνομα οργανισμού", 120),
});

export type RegisterInput = z.infer<typeof registerSchema>;
