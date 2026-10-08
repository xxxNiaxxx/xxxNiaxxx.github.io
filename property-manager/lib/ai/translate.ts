import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { GUEST_LANGUAGE_CODES, guestLanguage, languageName } from "@/lib/i18n/guest-language";
import type { OrgContext } from "@/lib/permissions";
import { assertGuest } from "@/lib/services/scope";
import { getProvider, type ChatProvider } from "./provider";

const LANGUAGE_ENGLISH: Record<string, string> = {
  el: "Greek", en: "English", de: "German", fr: "French", it: "Italian", es: "Spanish",
  pt: "Portuguese", nl: "Dutch", pl: "Polish", cs: "Czech", sv: "Swedish", sr: "Serbian (Latin script)",
};

const input = z.object({
  text: z.string().trim().min(1, "Γράψτε πρώτα το μήνυμα").max(5000),
  guestId: z.string().min(1).optional(),
  language: z.enum(GUEST_LANGUAGE_CODES).optional(),
});

/**
 * Translates a message a manager wrote into the guest's language (or a given one).
 * Needs an LLM: without AI_API_KEY there is no translation engine.
 */
export async function translateMessage(ctx: OrgContext, raw: unknown, provider: ChatProvider | null = getProvider()) {
  const data = input.parse(raw);
  let language = data.language;
  if (!language && data.guestId) language = guestLanguage(await assertGuest(ctx, data.guestId));
  if (!language) throw new AppError("BAD_REQUEST", "Επιλέξτε επισκέπτη ή γλώσσα");
  if (!provider) {
    throw new AppError("BAD_REQUEST", "Η μετάφραση χρειάζεται σύνδεση με μοντέλο AI (ρύθμιση AI_API_KEY στον server).");
  }
  const org = await db.organization.findUniqueOrThrow({ where: { id: ctx.organizationId }, select: { name: true } });
  const out = await provider.complete({
    tools: [],
    messages: [
      {
        role: "system",
        content: `You translate messages from the short-term rental host "${org.name}" to their guests. Translate the user's message into ${LANGUAGE_ENGLISH[language]}. Keep the meaning, tone, line breaks, names, codes, numbers and links exactly. Reply with the translated message only — no quotes, no notes.`,
      },
      { role: "user", content: data.text },
    ],
  });
  const text = out.content?.trim();
  if (!text) throw new AppError("BAD_REQUEST", "Η μετάφραση απέτυχε. Δοκιμάστε ξανά.");
  return { text, language, languageName: languageName(language) };
}
