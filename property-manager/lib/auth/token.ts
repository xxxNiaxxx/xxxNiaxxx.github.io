import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { db } from "@/lib/db";

/**
 * Bearer tokens for the mobile app (which cannot use the web session cookie).
 * HS256-signed with AUTH_SECRET; they carry only the user id, and every request
 * still resolves organization membership from the database.
 */
const ISSUER = "brachychronia-mobile";
const TTL = "30d";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function signMobileToken(userId: string) {
  return new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(userId).setIssuer(ISSUER).setIssuedAt().setExpirationTime(TTL).sign(secret());
}

export async function verifyMobileToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Shared by the web Credentials provider and the mobile login endpoint. */
export async function verifyCredentials(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
  return { id: user.id, email: user.email, name: user.name, image: user.image };
}
