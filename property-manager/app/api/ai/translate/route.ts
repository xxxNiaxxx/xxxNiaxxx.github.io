import { readJson, route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { translateMessage } from "@/lib/ai/translate";

/** { text, guestId? | language? } → { text, language, languageName } */
export const POST = route(async (req) => translateMessage(await requireOrganizationMember(), await readJson(req)));
