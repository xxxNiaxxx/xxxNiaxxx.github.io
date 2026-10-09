import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";

/**
 * Public address of the app for links in emails. A configured address wins
 * over the request's Host header, so a forged header cannot put a phishing
 * link into an email.
 */
export async function appOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("host");
  return host ? `${host.startsWith("localhost") ? "http" : "https"}://${host}` : "http://localhost:3000";
}

/**
 * The client's IP as seen by the platform: Vercel sets x-real-ip (and the
 * first x-forwarded-for entry) itself; elsewhere the last proxy hop is used,
 * which a client cannot forge.
 */
export async function clientIp() {
  const h = await headers();
  const vercel = h.get("x-vercel-forwarded-for") ?? (process.env.VERCEL ? h.get("x-real-ip") : null);
  if (vercel) return vercel.split(",")[0].trim();
  const hops = (h.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return hops.at(-1) ?? h.get("x-real-ip") ?? "unknown";
}

/**
 * Counts an attempt for `key` and tells whether it is over `limit` within the
 * window. Stored in the database, so it holds across server instances.
 */
export async function rateLimited(key: string, limit: number, windowMs: number, now = Date.now()) {
  const window = BigInt(Math.floor(now / windowMs));
  const row = await db.rateLimit.upsert({
    where: { key_window: { key, window } },
    create: { key, window },
    update: { count: { increment: 1 } },
  });
  // Old windows are of no use: clean up now and then.
  if (Math.random() < 0.01) await db.rateLimit.deleteMany({ where: { createdAt: { lt: new Date(now - 2 * 86_400_000) } } });
  return row.count > limit;
}
