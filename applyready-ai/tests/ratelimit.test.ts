import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMemoryKv } from "@/lib/kv";
import { consumeGeneration, lockDuplicate } from "@/lib/ratelimit";

beforeEach(() => resetMemoryKv());
afterEach(() => vi.unstubAllEnvs());

describe("rate limiting", () => {
  it("enforces the per-IP daily limit", async () => {
    vi.stubEnv("MAX_GENERATIONS_PER_IP_PER_DAY", "2");
    await consumeGeneration("a");
    await consumeGeneration("a");
    await expect(consumeGeneration("a")).rejects.toMatchObject({ code: "rate_limited" });
    await expect(consumeGeneration("b")).resolves.toBeUndefined();
  });
  it("enforces the global daily budget", async () => {
    vi.stubEnv("MAX_GENERATIONS_GLOBAL_PER_DAY", "2");
    await consumeGeneration("a");
    await consumeGeneration("b");
    await expect(consumeGeneration("c")).rejects.toMatchObject({ code: "global_limit" });
  });
  it("refuses the memory store on Vercel", async () => {
    vi.stubEnv("VERCEL", "1");
    await expect(consumeGeneration("a")).rejects.toMatchObject({ code: "limiter_not_configured" });
  });
  it("blocks duplicate in-flight requests until released", async () => {
    const release = await lockDuplicate("same");
    await expect(lockDuplicate("same")).rejects.toMatchObject({ code: "duplicate" });
    await release();
    await expect(lockDuplicate("same")).resolves.toBeTypeOf("function");
  });
});
