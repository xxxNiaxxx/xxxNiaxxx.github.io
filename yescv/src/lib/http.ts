import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { AppError, type ErrorCode } from "./errors";
import { logEvent } from "./log";

const noStore = { "Cache-Control": "no-store" };

export function json(data: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return NextResponse.json(data, { status: init.status ?? 200, headers: { ...noStore, ...init.headers } });
}

export function errorResponse(code: ErrorCode, status: number, headers?: Record<string, string>) {
  return json({ error: code }, { status, headers });
}

/** Converts anything thrown in a route into a safe JSON error. */
export function handleError(route: string, error: unknown) {
  if (error instanceof AppError) {
    if (error.status >= 500) logEvent("route_error", { route, code: error.code, detail: error.detail });
    return errorResponse(error.code, error.status);
  }
  // Unknown errors may carry user text in their message, so log only the type.
  logEvent("route_error", { route, code: "server_error", type: error instanceof Error ? error.name : typeof error });
  return errorResponse("server_error", 500);
}

/**
 * Reads a JSON body with a hard byte limit, before parsing, so oversized or
 * malformed requests are rejected cheaply. Then validates with a zod schema.
 */
export async function readJson<T extends z.ZodType>(request: Request, schema: T, maxBytes: number): Promise<z.infer<T>> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new AppError("too_large");
  const raw = await readLimited(request, maxBytes);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new AppError("invalid_input");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new AppError("invalid_input");
  return parsed.data;
}

export async function readLimited(request: Request, maxBytes: number): Promise<string> {
  return (await readLimitedBytes(request, maxBytes)).toString("utf8");
}

export async function readLimitedBytes(request: Request, maxBytes: number): Promise<Buffer> {
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new AppError("too_large");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/** First address in x-forwarded-for (set by Vercel), else x-real-ip. */
export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}

/** Short one-way hash, so rate-limit keys never contain raw IPs or text. */
export function hashKey(...parts: string[]): string {
  const salt = process.env.RATE_LIMIT_SALT || "yescv";
  return createHash("sha256").update([salt, ...parts].join("\u0000")).digest("hex").slice(0, 32);
}
