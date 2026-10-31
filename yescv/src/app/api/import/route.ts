import { AppError } from "@/lib/errors";
import { clientIp, handleError, hashKey, json, readLimitedBytes } from "@/lib/http";
import { detectKind, extractFileText, MAX_IMPORT_BYTES } from "@/lib/import";
import { logEvent } from "@/lib/log";
import { consumeExport } from "@/lib/ratelimit";
import { LIMITS } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Reads the text of an uploaded CV file (PDF, DOCX, TXT). Nothing is stored. */
export async function POST(request: Request) {
  try {
    const declared = Number(request.headers.get("content-length") || 0);
    if (declared > MAX_IMPORT_BYTES + 10_000) throw new AppError("too_large");
    const raw = await readLimitedBytes(request, MAX_IMPORT_BYTES + 10_000);
    let file: FormDataEntryValue | null;
    try {
      const form = await new Response(new Uint8Array(raw), { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
      file = form.get("file");
    } catch {
      throw new AppError("file_invalid");
    }
    if (!file || typeof file === "string" || file.size === 0) throw new AppError("file_invalid");
    if (file.size > MAX_IMPORT_BYTES) throw new AppError("too_large");
    await consumeExport(hashKey(clientIp(request))); // cheap CPU work: shares the export allowance
    const bytes = Buffer.from(await file.arrayBuffer());
    const kind = detectKind(bytes, file.name);
    if (!kind) throw new AppError("file_invalid");
    const text = await extractFileText(bytes, kind, LIMITS.cvMax);
    logEvent("import_ok", { kind, chars: text.length });
    return json({ text });
  } catch (error) {
    return handleError("import", error);
  }
}
