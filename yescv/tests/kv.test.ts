import { afterEach, describe, expect, it, vi } from "vitest";
import { getKv, isDurable } from "@/lib/kv";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Upstash store", () => {
  it("uses the REST pipeline with the Vercel KV variable names", async () => {
    vi.stubEnv("KV_REST_API_URL", "https://kv.example.upstash.io");
    vi.stubEnv("KV_REST_API_TOKEN", "token123");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([{ result: 3 }, { result: 1 }])));
    vi.stubGlobal("fetch", fetchMock);
    expect(isDurable()).toBe(true);
    expect(await getKv().incr("k", 60)).toBe(3);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://kv.example.upstash.io/pipeline");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token123");
    expect(JSON.parse(init.body as string)).toEqual([["INCR", "k"], ["EXPIRE", "k", 60, "NX"]]);
  });
  it("reports SET NX results", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://kv2.example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{ result: null }]))));
    expect(await getKv().setIfAbsent("k", "v", 10)).toBe(false);
  });
  it("throws on HTTP errors instead of silently allowing", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://kv3.example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 500 })));
    await expect(getKv().incr("k", 10)).rejects.toThrow();
  });
});
