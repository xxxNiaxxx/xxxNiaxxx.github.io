import { getAiConfig, transcribeImage } from "@/lib/ai";
import { AppError } from "@/lib/errors";
import { clientIp, handleError, hashKey, json, readJson } from "@/lib/http";
import { logEvent } from "@/lib/log";
import { consumeImageRead } from "@/lib/ratelimit";
import { extractSchema, imageMatchesType, LIMITS, MAX_IMAGE_BYTES } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Reads the text in a screenshot of a CV or job ad. The image is passed to the
 * vision model and then dropped: it is never stored or logged.
 */
export async function POST(request: Request) {
  const started = Date.now();
  try {
    const input = await readJson(request, extractSchema, Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 1_000).catch((error) => {
      throw error instanceof AppError && error.code === "invalid_input" ? new AppError("image_invalid") : error;
    });
    if (!imageMatchesType(input.image)) throw new AppError("image_invalid");
    if (!getAiConfig().visionModel) throw new AppError("ai_not_configured", "no_vision_model");
    await consumeImageRead(hashKey(clientIp(request)));
    const max = input.kind === "cv" ? LIMITS.cvMax : LIMITS.jobMax;
    const text = (await transcribeImage({ dataUrl: input.image, kind: input.kind })).slice(0, max);
    logEvent("extract_ok", { kind: input.kind, ms: Date.now() - started, chars: text.length });
    return json({ text });
  } catch (error) {
    return handleError("extract", error);
  }
}
