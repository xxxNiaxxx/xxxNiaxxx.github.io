import { readJson, route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { draftGuestReply } from "@/lib/ai/reply";

/** { reservationId, guestMessage } → { reply, offline, usedInfo, conversationUrl } */
export const POST = route(async (req) => draftGuestReply(await requireOrganizationMember(), await readJson(req)));
