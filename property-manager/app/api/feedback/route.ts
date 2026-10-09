import { readJson, route } from "@/lib/api";
import { requireUser, resolveMembership } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { appOrigin, rateLimited } from "@/lib/request";
import { submitFeedback } from "@/lib/services/feedback";

/** "Στείλτε σχόλιο": { kind: BUG|IDEA|OTHER, message, page?, client? } */
export const POST = route(async (req) => {
  const user = await requireUser();
  if (await rateLimited(`feedback:${user.id}`, 10, 60 * 60_000)) throw new AppError("BAD_REQUEST", "Πολλά μηνύματα σε λίγο χρόνο. Δοκιμάστε αργότερα.");
  const membership = await resolveMembership(user.id, req.headers.get("x-organization-id") ?? undefined);
  return submitFeedback(user, membership?.organizationId ?? null, await readJson(req), await appOrigin());
});
