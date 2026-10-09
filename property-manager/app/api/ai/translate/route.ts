import { readJson, route } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { translateMessage } from "@/lib/ai/translate";
import { providerFor } from "@/lib/ai/provider";

/** { text, guestId? | language? } → { text, language, languageName } */
export const POST = route(async (req) => {
  const ctx = await requireOrganizationMember();
  return translateMessage(ctx, await readJson(req), await providerFor(ctx));
});
