import { AppError } from "./errors";
import { getKv, isDurable, isServerless } from "./kv";

const DAY = 86_400;

function intEnv(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function limits() {
  return {
    perIpPerDay: intEnv("MAX_GENERATIONS_PER_IP_PER_DAY", intEnv("MAX_GENERATIONS_PER_DAY", 10)),
    globalPerDay: intEnv("MAX_GENERATIONS_GLOBAL_PER_DAY", 300),
    exportsPerIpPerDay: intEnv("MAX_EXPORTS_PER_IP_PER_DAY", 100),
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Refuses to run on Vercel with the per-instance memory store. */
export function assertLimiterReady(): void {
  if (isServerless() && !isDurable()) throw new AppError("limiter_not_configured");
}

/**
 * Counts one AI generation against the caller's daily allowance and the
 * global daily budget (which caps the owner's AI bill). A request over either
 * limit is refused.
 */
export async function consumeGeneration(ipKey: string): Promise<void> {
  assertLimiterReady();
  const kv = getKv();
  const { perIpPerDay, globalPerDay } = limits();
  const day = today();
  // Per-caller first, so one caller hammering the API cannot burn the global budget.
  const mine = await kv.incr(`rl:gen:ip:${ipKey}:${day}`, DAY + 3600);
  if (mine > perIpPerDay) throw new AppError("rate_limited");
  const global = await kv.incr(`rl:gen:global:${day}`, DAY + 3600);
  if (global > globalPerDay) throw new AppError("global_limit");
}

export async function consumeExport(ipKey: string): Promise<void> {
  assertLimiterReady();
  const count = await getKv().incr(`rl:exp:ip:${ipKey}:${today()}`, DAY + 3600);
  if (count > limits().exportsPerIpPerDay) throw new AppError("rate_limited");
}

/**
 * Holds a short lock for an identical in-flight request (double clicks,
 * retries while the first is still running). Returns a release function.
 */
export async function lockDuplicate(requestKey: string, ttlSeconds = 120): Promise<() => Promise<void>> {
  const kv = getKv();
  const key = `lock:gen:${requestKey}`;
  if (!(await kv.setIfAbsent(key, "1", ttlSeconds))) throw new AppError("duplicate");
  return () => kv.del(key).catch(() => undefined);
}
