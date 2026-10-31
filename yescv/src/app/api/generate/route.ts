import { findUnsupportedFigures, generateApplication, getAiConfig } from "@/lib/ai";
import { clientIp, handleError, hashKey, json, readJson } from "@/lib/http";
import { logEvent } from "@/lib/log";
import { consumeGeneration, lockDuplicate } from "@/lib/ratelimit";
import { requestSchema } from "@/lib/schema";
import { sourceFrom } from "@/lib/source";

export const runtime = "nodejs";
export const maxDuration = 60;

// CV + job ad + company text + previous result + revision, UTF-8 (Greek is 2 bytes per letter).
const MAX_BODY_BYTES = 240_000;

export async function POST(request: Request) {
  const started = Date.now();
  let release: (() => Promise<void>) | undefined;
  try {
    const input = await readJson(request, requestSchema, MAX_BODY_BYTES);
    getAiConfig(); // fail fast on configuration problems, before counting the request
    const ipKey = hashKey(clientIp(request));
    release = await lockDuplicate(hashKey(ipKey, input.cvText, input.jobText, input.companyText, input.revision, input.language));
    await consumeGeneration(ipKey);
    const result = await generateApplication(input);
    const checks = findUnsupportedFigures(input.cvText, result.cv);
    logEvent("generate_ok", { revision: Boolean(input.revision), ms: Date.now() - started, checks: checks.length, source: sourceFrom(request) });
    return json({ result, checks });
  } catch (error) {
    return handleError("generate", error);
  } finally {
    await release?.();
  }
}
