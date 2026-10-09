import { z } from "zod";
import { readJson, route, searchParamsObject } from "@/lib/api";
import { requireOrganizationMember } from "@/lib/auth";
import { answerTopic, applySuggestions, interviewState, resetSkipped, skipTopic, suggestFromListing } from "@/lib/ai/interview";
import { providerFor } from "@/lib/ai/provider";

/** ?propertyId= → where the knowledge interview stands and the next question. */
export const GET = route(async (req) => {
  const { propertyId } = z.object({ propertyId: z.string().min(1) }).parse(searchParamsObject(req));
  return interviewState(await requireOrganizationMember(), propertyId);
});

const action = z.object({ action: z.enum(["answer", "skip", "reset", "import", "apply"]), propertyId: z.string().min(1) }).loose();

/**
 * { action: "answer", topic, answer, followUp? } → { followUp }
 * { action: "skip", topic } · { action: "reset" }
 * { action: "import", url? | text? } → { readPage, suggestions }
 * { action: "apply", answers: [{ topic, answer }] } → state
 */
export const POST = route(async (req) => {
  const ctx = await requireOrganizationMember();
  const body = action.parse(await readJson(req));
  switch (body.action) {
    case "answer":
      return answerTopic(ctx, body, await providerFor(ctx));
    case "skip":
      await skipTopic(ctx, body);
      return { ok: true };
    case "reset":
      await resetSkipped(ctx, body.propertyId);
      return { ok: true };
    case "import":
      return suggestFromListing(ctx, body, await providerFor(ctx));
    case "apply":
      return applySuggestions(ctx, body);
  }
});
