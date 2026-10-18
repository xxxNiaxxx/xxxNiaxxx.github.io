import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Two-step sign-in codes (TOTP, RFC 6238): the 6 digits that Google
 * Authenticator, Microsoft Authenticator etc. show every 30 seconds.
 */
const STEP = 30;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string) {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of s.replace(/[\s=-]/g, "").toUpperCase()) {
    const i = ALPHABET.indexOf(c);
    if (i < 0) continue;
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const newTotpSecret = () => base32Encode(randomBytes(20));

export function totpCode(secret: string, step: number) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const h = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = h[h.length - 1] & 15;
  return String((h.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

/**
 * The time step the code belongs to (now, or one step either side for clock
 * drift), or null. Steps at or before `lastStep` are refused so a code works once.
 */
export function verifyTotp(secret: string, code: string, now = Date.now(), lastStep: number | null = null): number | null {
  const digits = code.replace(/\D/g, "");
  if (digits.length !== 6) return null;
  const current = Math.floor(now / 1000 / STEP);
  for (const step of [current - 1, current, current + 1]) {
    if (lastStep !== null && step <= lastStep) continue;
    if (timingSafeEqual(Buffer.from(totpCode(secret, step)), Buffer.from(digits))) return step;
  }
  return null;
}

/** otpauth:// link: opens the authenticator app on the phone, or is shown as a QR code. */
export function totpUri(secret: string, account: string, issuer: string) {
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP}`;
}

/** One-time recovery codes (for a lost phone): shown once, stored as hashes. */
export function newRecoveryCodes(count = 8) {
  return Array.from({ length: count }, () => {
    const raw = base32Encode(randomBytes(6)).slice(0, 10);
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export const hashRecoveryCode = (code: string) =>
  createHash("sha256").update(code.replace(/[\s-]/g, "").toUpperCase()).digest("hex");
