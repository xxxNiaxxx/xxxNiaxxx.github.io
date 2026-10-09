import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const request = vi.hoisted(() => ({ authorization: "" }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(request.authorization ? { authorization: request.authorization } : {}),
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("@/lib/auth/config", () => ({ auth: async () => null }));

import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/auth";
import { signMobileToken, verifyCredentials } from "@/lib/auth/token";
import { db } from "@/lib/db";
import { TERMS_VERSION } from "@/lib/legal";
import { registerAccount } from "@/lib/services/accounts";
import { setRegistrationOpen } from "@/lib/services/waitlist";
import { acceptTerms, changePassword, signOutEverywhere } from "@/lib/services/settings";
import { resetDatabase } from "./helpers";

describe("signing out everywhere, passwords and terms", () => {
  let userId: string;
  const email = `owner${Date.now()}@test.local`;

  beforeAll(async () => {
    await resetDatabase();
    const user = await db.user.create({ data: { email, name: "Owner", passwordHash: await bcrypt.hash("old-password", 4) } });
    userId = user.id;
  });
  beforeEach(() => {
    request.authorization = "";
  });

  it("a mobile token stops working after signing out everywhere", async () => {
    const creds = await verifyCredentials(email, "old-password");
    request.authorization = `Bearer ${await signMobileToken(userId, creds!.sessionVersion)}`;
    await expect(requireUser()).resolves.toMatchObject({ id: userId });
    await signOutEverywhere(userId);
    await expect(requireUser()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    // A new sign-in gets a token that works.
    const again = await verifyCredentials(email, "old-password");
    request.authorization = `Bearer ${await signMobileToken(userId, again!.sessionVersion)}`;
    await expect(requireUser()).resolves.toMatchObject({ id: userId });
  });

  it("changing the password needs the current one and ends every session", async () => {
    const before = (await db.user.findUniqueOrThrow({ where: { id: userId } })).sessionVersion;
    await expect(changePassword(userId, { currentPassword: "wrong", newPassword: "new-password-1" })).rejects.toThrow(/τωρινός κωδικός/);
    await expect(changePassword(userId, { currentPassword: "old-password", newPassword: "short" })).rejects.toMatchObject({ name: "ZodError" });
    await changePassword(userId, { currentPassword: "old-password", newPassword: "new-password-1" });
    expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).sessionVersion).toBe(before + 1);
    expect(await verifyCredentials(email, "old-password")).toBeNull();
    expect(await verifyCredentials(email, "new-password-1")).not.toBeNull();
  });

  it("sign-up requires accepting the terms and records the version", async () => {
    const base = { name: "New", email: `new${Date.now()}@test.local`, password: "password123", organizationName: "New Stays" };
    await setRegistrationOpen(true);
    await expect(registerAccount(base)).rejects.toMatchObject({ name: "ZodError" });
    await expect(registerAccount({ ...base, acceptTerms: false })).rejects.toMatchObject({ name: "ZodError" });
    const created = await registerAccount({ ...base, acceptTerms: true });
    const user = await db.user.findUniqueOrThrow({ where: { id: created.userId } });
    expect(user.termsVersion).toBe(TERMS_VERSION);
    expect(user.termsAcceptedAt).toBeInstanceOf(Date);
    await setRegistrationOpen(false);
  });

  it("existing users accept the current terms", async () => {
    expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).termsVersion).toBeNull();
    await acceptTerms(userId);
    expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).termsVersion).toBe(TERMS_VERSION);
  });
});
