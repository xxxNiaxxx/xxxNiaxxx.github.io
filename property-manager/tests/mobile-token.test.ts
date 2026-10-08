import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { signMobileToken, verifyMobileToken } from "@/lib/auth/token";

describe("mobile bearer tokens", () => {
  it("round-trips the user id", async () => {
    expect(await verifyMobileToken(await signMobileToken("user_1"))).toBe("user_1");
  });

  it("rejects tampered, foreign-secret and garbage tokens", async () => {
    const token = await signMobileToken("user_1");
    const [h, , s] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ sub: "admin", iss: "brachychronia-mobile" })).toString("base64url");
    expect(await verifyMobileToken(`${h}.${forgedPayload}.${s}`)).toBeNull();
    const foreign = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject("user_1").setIssuer("brachychronia-mobile")
      .setExpirationTime("1h").sign(new TextEncoder().encode("another-secret"));
    expect(await verifyMobileToken(foreign)).toBeNull();
    expect(await verifyMobileToken("not-a-token")).toBeNull();
  });
});
