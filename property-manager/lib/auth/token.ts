import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { db } from "@/lib/db";
import { clientIp, rateLimited } from "@/lib/request";

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

/**
 * Shared by the web Credentials provider and the mobile login endpoint.
 * At most 10 attempts per account and 30 per IP in 15 minutes.
 */
export async function verifyCredentials(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  if ((await rateLimited(`login:${normalized}`, 10, 15 * 60_000)) || (await rateLimited(`login-ip:${await ip()}`, 30, 15 * 60_000))) return null;
  const user = await db.user.findUnique({ where: { email: normalized } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return null;
  return { id: user.id, email: user.email, name: user.name, image: user.image, sessionVersion: user.sessionVersion };
}
