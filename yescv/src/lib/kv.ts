/**
 * A tiny key-value store used for rate limits and Stripe purchase records.
 *
 * - With Upstash Redis configured (UPSTASH_REDIS_REST_URL/TOKEN, or the
 *   KV_REST_API_URL/TOKEN names the Vercel marketplace integration sets) it is
 *   durable and shared by every serverless instance. Talks to the REST API
 *   with fetch, so no extra dependency.
 * - Otherwise it falls back to process memory, which is fine for local
 *   development and tests but NOT for Vercel; `isDurable()` lets callers refuse
 *   to run there without it.
 */
export interface Kv {
  /** Increments a counter; sets the expiry only when the key is new. Returns the new value. */
  incr(key: string, ttlSeconds: number): Promise<number>;
  /** Sets the key only if it does not exist. Returns true when it was set. */
  setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<void>;
}

type Entry = { value: string; expiresAt: number };

class MemoryKv implements Kv {
  private data = new Map<string, Entry>();

  private live(key: string): Entry | undefined {
    const entry = this.data.get(key);
    if (entry && entry.expiresAt <= Date.now()) {
      this.data.delete(key);
      return undefined;
    }
    return entry;
  }
  async incr(key: string, ttlSeconds: number) {
    const entry = this.live(key);
    const value = (entry ? Number(entry.value) : 0) + 1;
    this.data.set(key, { value: String(value), expiresAt: entry?.expiresAt ?? Date.now() + ttlSeconds * 1000 });
    return value;
  }
  async setIfAbsent(key: string, value: string, ttlSeconds: number) {
    if (this.live(key)) return false;
    this.data.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    return true;
  }
  async set(key: string, value: string, ttlSeconds?: number) {
    this.data.set(key, { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : Infinity });
  }
  async get(key: string) {
    return this.live(key)?.value ?? null;
  }
  async del(key: string) {
    this.data.delete(key);
  }
  clear() {
    this.data.clear();
  }
}

class UpstashKv implements Kv {
  constructor(private url: string, private token: string) {}

  private async pipeline(commands: (string | number)[][]): Promise<unknown[]> {
    const response = await fetch(`${this.url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`kv_http_${response.status}`);
    const results = (await response.json()) as { result?: unknown; error?: string }[];
    const failed = results.find((r) => r.error);
    if (failed) throw new Error("kv_command_failed");
    return results.map((r) => r.result);
  }
  async incr(key: string, ttlSeconds: number) {
    const [count] = await this.pipeline([["INCR", key], ["EXPIRE", key, ttlSeconds, "NX"]]);
    return Number(count);
  }
  async setIfAbsent(key: string, value: string, ttlSeconds: number) {
    const [result] = await this.pipeline([["SET", key, value, "NX", "EX", ttlSeconds]]);
    return result === "OK";
  }
  async set(key: string, value: string, ttlSeconds?: number) {
    await this.pipeline([ttlSeconds ? ["SET", key, value, "EX", ttlSeconds] : ["SET", key, value]]);
  }
  async get(key: string) {
    const [result] = await this.pipeline([["GET", key]]);
    return typeof result === "string" ? result : null;
  }
  async del(key: string) {
    await this.pipeline([["DEL", key]]);
  }
}

const memory = new MemoryKv();
let cached: { signature: string; kv: Kv } | undefined;

function upstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : undefined;
}

export function isDurable(): boolean {
  return Boolean(upstashConfig());
}

/** True on any Vercel deployment (production or preview), where memory is per-instance. */
export function isServerless(): boolean {
  return Boolean(process.env.VERCEL);
}

export function getKv(): Kv {
  const config = upstashConfig();
  if (!config) return memory;
  const signature = `${config.url}|${config.token.length}`;
  if (cached?.signature !== signature) cached = { signature, kv: new UpstashKv(config.url, config.token) };
  return cached.kv;
}

/** Test helper. */
export function resetMemoryKv(): void {
  memory.clear();
}
