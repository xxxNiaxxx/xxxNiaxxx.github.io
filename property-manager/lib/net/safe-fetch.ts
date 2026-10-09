import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/** Addresses a public calendar can never live at: loopback, private, link-local, carrier NAT, metadata. */
export function isPrivateAddress(ip: string): boolean {
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (isIP(v4) === 4) {
    const [a, b] = v4.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v6 = ip.toLowerCase();
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe8") || v6.startsWith("fe9") || v6.startsWith("fea") || v6.startsWith("feb");
}

export class BlockedUrlError extends Error {}

async function assertPublicHttps(url: URL) {
  if (url.protocol !== "https:") throw new BlockedUrlError("Μόνο σύνδεσμοι https");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((a) => isPrivateAddress(a.address))) throw new BlockedUrlError("Ο σύνδεσμος δεν είναι δημόσια διεύθυνση");
}

/**
 * GET of a user-given public URL: https only, never to private or internal
 * addresses (checked again on every redirect), with a size cap read as a stream.
 */
export async function fetchPublicText(raw: string, opts: { maxBytes: number; timeoutMs: number; headers?: Record<string, string> }) {
  let url = new URL(raw);
  const signal = AbortSignal.timeout(opts.timeoutMs);
  for (let hop = 0; hop <= 3; hop++) {
    await assertPublicHttps(url);
    const res = await fetch(url, { signal, headers: opts.headers, redirect: "manual" });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      continue;
    }
    if (!res.ok) return { ok: false as const, status: res.status, text: "" };
    if (Number(res.headers.get("content-length") ?? 0) > opts.maxBytes) throw new BlockedUrlError("too-large");
    const reader = res.body?.getReader();
    if (!reader) return { ok: true as const, status: res.status, text: "" };
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > opts.maxBytes) {
        await reader.cancel();
        throw new BlockedUrlError("too-large");
      }
      chunks.push(value);
    }
    return { ok: true as const, status: res.status, text: new TextDecoder().decode(Buffer.concat(chunks)) };
  }
  throw new BlockedUrlError("Πάρα πολλές ανακατευθύνσεις");
}
