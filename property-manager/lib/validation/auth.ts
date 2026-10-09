import { z } from "zod";
import { email, requiredText } from "./common";

export const registerSchema = z.object({
  name: requiredText("Ονοματεπώνυμο", 100),
  email,
  password: z.string().min(8, "Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες").max(200),
  /** Not needed when joining an existing team through an invitation. */
  organizationName: requiredText("Όνομα οργανισμού", 120).optional(),
  invite: z.string().trim().min(1).max(200).optional(),
  /** Personal sign-up link from the waitlist. */
  access: z.string().trim().min(1).max(200).optional(),
  acceptTerms: z.literal(true, "Χρειάζεται να αποδεχτείτε τους όρους χρήσης και τη σύμβαση επεξεργασίας δεδομένων"),
}).refine((v) => v.invite || v.organizationName, { message: "Το πεδίο «Όνομα οργανισμού» είναι υποχρεωτικό", path: ["organizationName"] });

export type RegisterInput = z.infer<typeof registerSchema>;
