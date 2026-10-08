import { db } from "@/lib/db";
import { badRequest } from "@/lib/errors";
import type { OrgContext } from "@/lib/permissions";
import { messageCreateSchema } from "@/lib/validation/message";
import { assertGuest, assertReservation, type Tx } from "./scope";
import { serializeMessage } from "./serializers";

/**
 * Phase 1 has no delivery channels: an outbound message is stored on the
 * INTERNAL channel and "sending" just marks it SENT.
 */
export async function createMessage(ctx: OrgContext, input: unknown, client: Tx = db) {
  const data = messageCreateSchema.parse(input);
  let guestId = data.guestId ?? null;
  if (data.reservationId) {
    const r = await assertReservation(ctx, data.reservationId, client);
    if (guestId && guestId !== r.guestId) throw badRequest("The guest does not belong to this reservation");
    guestId = r.guestId;
  }
  if (guestId) await assertGuest(ctx, guestId, client);
  const row = await client.message.create({
    data: {
      organizationId: ctx.organizationId,
      guestId,
      reservationId: data.reservationId ?? null,
      direction: "OUTBOUND",
      channel: "INTERNAL",
      content: data.content,
      status: data.send ? "SENT" : "DRAFT",
      sentAt: data.send ? new Date() : null,
    },
  });
  return serializeMessage(row);
}
