import { route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { listConversations } from "@/lib/ai/chat";

export const GET = route(async () => listConversations(await requireOrganizationMember()));
