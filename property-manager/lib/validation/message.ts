import { z } from "zod";
import { id, requiredText } from "./common";

export const messageCreateSchema = z
  .object({
    guestId: id.nullish(),
    reservationId: id.nullish(),
    content: requiredText("Message", 5000),
    send: z.boolean().default(false),
  })
  .refine((v) => v.guestId || v.reservationId, { message: "Choose a guest or reservation", path: ["guestId"] });

export type MessageCreateInput = z.infer<typeof messageCreateSchema>;
