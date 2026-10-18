import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { clientIp, rateLimited } from "@/lib/request";
import { checkSecondStep, recordLogin, type LoginInfo } from "@/lib/services/security";

/**
 * Bearer tokens for the mobile app (which cannot use the web session cookie).
 * HS256-signed with AUTH_SECRET; they carry the user id and the user's session
 * version (signing out everywhere bumps it), and every request still resolves
 * organization membership from the database.
 */
const ISSUER = "brachychronia-mobile";
const TTL = "30d";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function signMobileToken(userId: string, sessionVersion = 0) {
  return new SignJWT({ sv: sessionVersion }).setProtectedHeader({ alg: "HS256" }).setSubject(userId).setIssuer(ISSUER).setIssuedAt().setExpirationTime(TTL).sign(secret());
}

export async function verifyMobileToken(token: string): Promise<{ userId: string; sessionVersion: number } | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    return { userId: payload.sub, sessionVersion: typeof payload.sv === "number" ? payload.sv : 0 };
  } catch {
    return null;
  }
}

/** A real bcrypt hash, compared when the email is unknown so timing does not reveal accounts. */
const DUMMY_HASH = "$2b$12$k7UWmCKLzpANdSkKQNIwOuCDr7pQdO6fq02uFG1Or0JChfMOEFc/m";

async function ip() {
  try {
    return await clientIp();
  } catch {
    return "unknown";
  }
}

async function userAgent() {
  try {
    return (await headers()).get("user-agent");
  } catch {
    return null;
  }
}

/** The password was right but the two-step code is missing ("totp") or wrong ("totp-invalid"). */
export class SecondStepError extends Error {
  constructor(public readonly step: "totp" | "totp-invalid") {
    super(step);
  }
}

/**
 * Shared by the web Credentials provider and the mobile login endpoint.
 * At most 10 attempts per account and 30 per IP in 15 minutes (two-step
 * codes count too). With two-step sign-in on, `code` is required: without it
 * (or with a wrong one) this throws SecondStepError. A successful sign-in is
 * recorded, with an alert for a new device, when `login` is given.
 */
export async function verifyCredentials(email: string, password: string, opts: { code?: string | null; client?: LoginInfo["client"] } = {}) {
  const normalized = email.trim().toLowerCase();
  const address = await ip();
  if ((await rateLimited(`login:${normalized}`, 10, 15 * 60_000)) || (await rateLimited(`login-ip:${address}`, 30, 15 * 60_000))) return null;
  const user = await db.user.findUnique({ where: { email: normalized } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return null;
  const step = await checkSecondStep(user, opts.code);
  if (step !== "ok") throw new SecondStepError(step);
  if (opts.client) await recordLogin(user, { client: opts.client, ip: address, userAgent: await userAgent() }).catch((e) => console.error("recordLogin failed", e));
  return { id: user.id, email: user.email, name: user.name, image: user.image, sessionVersion: user.sessionVersion };
}
