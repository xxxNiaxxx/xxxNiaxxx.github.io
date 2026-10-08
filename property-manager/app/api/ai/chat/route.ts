import { z } from "zod";
import { readJson, route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { sendChatMessage } from "@/lib/ai/chat";

const body = z.object({
  conversationId: z.string().min(1).nullish(),
  message: z.string().trim().min(1, "Type a message").max(4000),
});

export const POST = route(async (req) => {
  const ctx = await requireOrganizationMember();
  return sendChatMessage(ctx, body.parse(await readJson(req)));
});
