import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "node:crypto";

/**
 * Encryption of sensitive guest data at rest (AES-256-GCM). The key never
 * lives in the database: it is DATA_ENCRYPTION_KEY (32 bytes, base64) when
 * set, otherwise derived from AUTH_SECRET. A stolen database dump or backup
 * then shows only "enc:v1:…" values.
 *
 * Values carry the id of the key that encrypted them, so DATA_ENCRYPTION_KEY
 * can be added later: the daily job (reencryptGuestData) moves old values to
 * the current key. Never change or remove a key while values still use it.
 */
const PREFIX = "enc:v1:";
/** Shown instead of a value whose key is missing, rather than failing the page. */
export const UNREADABLE = "🔒";

type Keyring = { primaryId: string; keys: Map<string, Buffer> };
let cached: { env: string; ring: Keyring } | null = null;

function keyring(): Keyring {
  const dataKey = process.env.DATA_ENCRYPTION_KEY?.trim();
  const authSecret = process.env.AUTH_SECRET;
  const env = `${dataKey ?? ""}|${authSecret ?? ""}`;
  if (cached?.env === env) return cached.ring;
  const keys = new Map<string, Buffer>();
  if (authSecret) keys.set("a", Buffer.from(hkdfSync("sha256", authSecret, "", "guest-data-v1", 32)));
  if (dataKey) {
    const k = Buffer.from(dataKey, "base64");
    if (k.length !== 32) throw new Error("DATA_ENCRYPTION_KEY must be 32 bytes in base64 (openssl rand -base64 32)");
    keys.set("k", k);
  }
  const primaryId = dataKey ? "k" : "a";
  if (!keys.has(primaryId)) throw new Error("AUTH_SECRET is not set");
  const ring = { primaryId, keys };
  cached = { env, ring };
  return ring;
}

export function isEncrypted(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(PREFIX);
}

/** Encrypts a string; null/undefined and already-encrypted values pass through. */
export function encryptField<T extends string | null | undefined>(value: T): T {
  if (typeof value !== "string" || isEncrypted(value)) return value;
  const { primaryId, keys } = keyring();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keys.get(primaryId)!, iv);
  const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${PREFIX}${primaryId}:${Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url")}` as T;
}

/** Decrypts a value written by encryptField; plain (older) values pass through. */
export function decryptField<T extends string | null | undefined>(value: T): T {
  if (!isEncrypted(value)) return value;
  const [, , id, data] = value.split(":");
  const key = keyring().keys.get(id);
  if (!key || !data) return UNREADABLE as T;
  try {
    const raw = Buffer.from(data, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8") as T;
  } catch {
    return UNREADABLE as T;
  }
}

/** True when the value is plain or encrypted with an older key. */
export function needsReencryption(value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (!isEncrypted(value)) return true;
  return value.split(":")[2] !== keyring().primaryId;
}

/** JSON values (Reservation.platformDetails) are stored as { $enc: "enc:v1:…" }. */
export function encryptJson(value: unknown): unknown {
  // Only plain JSON: Prisma's DbNull/JsonNull markers pass through.
  const plainJson = Array.isArray(value) || (typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype);
  if (!plainJson || isEncryptedJson(value)) return value;
  return { $enc: encryptField(JSON.stringify(value)) };
}

export function isEncryptedJson(value: unknown): value is { $enc: string } {
  return typeof value === "object" && value !== null && !Array.isArray(value) && isEncrypted((value as { $enc?: unknown }).$enc);
}

export function decryptJson(value: unknown): unknown {
  if (!isEncryptedJson(value)) return value;
  const text = decryptField(value.$enc);
  if (text === UNREADABLE) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Blind index: a keyed hash that lets us find a guest by exact email or phone
 * without storing them in the clear.
 */
function blindIndex(kind: string, normalized: string | null): string | null {
  if (!normalized) return null;
  const { primaryId, keys } = keyring();
  const hashKey = hkdfSync("sha256", keys.get(primaryId)!, "", "blind-index-v1", 32);
  return createHmac("sha256", Buffer.from(hashKey)).update(`${kind}:${normalized}`).digest("hex").slice(0, 40);
}

export function normalizeEmail(email: string | null | undefined): string | null {
  const v = email?.trim().toLowerCase();
  return v && v.includes("@") ? v : null;
}

/** The last 9 digits, so "+30 697 123 4567" and "6971234567" match. */
export function normalizePhone(phone: string | null | undefined): string | null {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits.length >= 6 ? digits.slice(-9) : null;
}

export const emailIndex = (email: string | null | undefined) => blindIndex("email", normalizeEmail(email));
export const phoneIndex = (phone: string | null | undefined) => blindIndex("phone", normalizePhone(phone));

/** Id of the key new values are encrypted with ("k" or "a"). */
export const currentKeyId = () => keyring().primaryId;
