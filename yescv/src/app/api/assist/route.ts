import { getAiConfig } from "@/lib/ai";
import { runAssist } from "@/lib/assist";
import { clientIp, handleError, hashKey, json, readJson } from "@/lib/http";
import { logEvent } from "@/lib/log";
import { consumeGeneration, lockDuplicate } from "@/lib/ratelimit";
import { assistRequestSchema } from "@/lib/schema";
import { sourceFrom } from "@/lib/source";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY_BYTES = 120_000;

/** Emails, gap plan, LinkedIn profile or practice feedback. Counts as one generation. */
export async function POST(request: Request) {
  const started = Date.now();
  let release: (() => Promise<void>) | undefined;
  try {
    const input = await readJson(request, assistRequestSchema, MAX_BODY_BYTES);
    getAiConfig();
    const ipKey = hashKey(clientIp(request));
    release = await lockDuplicate(hashKey(ipKey, input.task, input.tailoredCv, input.answer ?? ""));
    await consumeGeneration(ipKey);
    const result = await runAssist(input);
    logEvent("assist_ok", { task: input.task, ms: Date.now() - started, source: sourceFrom(request) });
    return json({ result });
  } catch (error) {
    return handleError("assist", error);
  } finally {
    await release?.();
  }
}
