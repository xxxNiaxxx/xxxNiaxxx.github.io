"use client";

import { useRef } from "react";
import type { ErrorCode } from "@/lib/errors";
import { copy, format } from "@/lib/i18n";
import { imageToDataUrl, MAX_SOURCE_IMAGE_BYTES } from "@/lib/client-image";

type Copy = (typeof copy)["en"];

export type SourceEvents = {
  onText: (text: string) => void;
  onBusy: (label: string | null) => void;
  onError: (code: ErrorCode) => void;
  onDone: (message: string) => void;
};

const FILE_TYPES = ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
const IMAGE_TYPES = "image/png,image/jpeg,image/webp";

async function errorCode(response: Response): Promise<ErrorCode> {
  try {
    return ((await response.json()) as { error?: ErrorCode }).error ?? "server_error";
  } catch {
    return response.status === 413 ? "too_large" : response.status === 504 ? "ai_timeout" : "server_error";
  }
}

/** Reads screenshots with the AI, one after another, and hands back the combined text. */
export async function readImages(files: File[], kind: "cv" | "job", t: Copy, events: SourceEvents) {
  const images = files.filter((f) => f.type.startsWith("image/"));
  if (!images.length) return;
  const texts: string[] = [];
  try {
    for (const [i, file] of images.entries()) {
      events.onBusy(format(t.reading, { n: i + 1, total: images.length }));
      if (file.size > MAX_SOURCE_IMAGE_BYTES) throw "image_invalid";
      let image: string;
      try {
        image = await imageToDataUrl(file);
      } catch {
        throw "image_invalid";
      }
      const response = await fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, image }) });
      if (!response.ok) throw await errorCode(response);
      texts.push(((await response.json()) as { text: string }).text);
    }
  } catch (error) {
    events.onError(typeof error === "string" ? (error as ErrorCode) : "ai_unavailable");
  } finally {
    events.onBusy(null);
    // Keep whatever was read before a failure.
    if (texts.length) {
      events.onText(texts.join("\n\n"));
      events.onDone(t.screenshotAdded);
    }
  }
}

async function importFile(file: File, t: Copy, events: SourceEvents) {
  events.onBusy(t.importing);
  try {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/import", { method: "POST", body });
    if (!response.ok) return events.onError(await errorCode(response));
    events.onText(((await response.json()) as { text: string }).text);
    events.onDone(t.imported);
  } catch {
    events.onError("server_error");
  } finally {
    events.onBusy(null);
  }
}

/** Buttons under a text box: import a file (CV only) and/or add screenshots. */
export function SourceTools({ kind, allowFiles, imageInput, disabled, t, events, hintId }: {
  kind: "cv" | "job";
  allowFiles: boolean;
  imageInput: boolean;
  disabled: boolean;
  t: Copy;
  events: SourceEvents;
  hintId: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  if (!allowFiles && !imageInput) return null;

  return (
    <div className="source-tools">
      {allowFiles && (
        <>
          <button type="button" className="secondary" disabled={disabled} onClick={() => fileRef.current?.click()} aria-describedby={hintId}>{t.importFile}</button>
          <input ref={fileRef} type="file" hidden accept={imageInput ? `${FILE_TYPES},${IMAGE_TYPES}` : FILE_TYPES}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              // A picture chosen here goes through the screenshot reader instead.
              if (file.type.startsWith("image/")) void readImages([file], kind, t, events);
              else void importFile(file, t, events);
            }} />
        </>
      )}
      {imageInput && (
        <>
          <button type="button" className="secondary" disabled={disabled} onClick={() => imageRef.current?.click()} aria-describedby={hintId}>{t.screenshot}</button>
          <input ref={imageRef} type="file" hidden multiple accept={IMAGE_TYPES}
            onChange={(e) => {
              const files = [...(e.target.files ?? [])].slice(0, 4);
              e.target.value = "";
              void readImages(files, kind, t, events);
            }} />
        </>
      )}
      <span id={hintId} className="small">
        {[allowFiles && t.importHint, imageInput && t.screenshotHint].filter(Boolean).join(" ")}
      </span>
    </div>
  );
}
