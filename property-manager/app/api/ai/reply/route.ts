import { readJson, route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { draftGuestReply } from "@/lib/ai/reply";
import { providerFor } from "@/lib/ai/provider";

/** { reservationId, guestMessage } → { reply, offline, usedInfo, conversationUrl } */
export const POST = route(async (req) => {
  const ctx = await requireOrganizationMember();
  return draftGuestReply(ctx, await readJson(req), await providerFor(ctx));
});
