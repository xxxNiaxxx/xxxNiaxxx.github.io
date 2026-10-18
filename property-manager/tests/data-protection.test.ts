import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const request = vi.hoisted(() => ({ userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile Safari/537.36" }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "user-agent": request.userAgent, "x-forwarded-for": "203.0.113.7" }),
  cookies: async () => ({ get: () => undefined }),
}));

import bcrypt from "bcryptjs";
import { base32Encode, hashRecoveryCode, totpCode, verifyTotp } from "@/lib/auth/totp";
import { SecondStepError, verifyCredentials } from "@/lib/auth/token";
import { decryptField, emailIndex, encryptField, encryptJson, decryptJson, phoneIndex } from "@/lib/crypto/fields";
import { db } from "@/lib/db";
import { setEmailSenderForTests, type EmailMessage } from "@/lib/email";
import type { OrgContext } from "@/lib/permissions";
import { purgeOldIdNumbers, reencryptGuestData } from "@/lib/services/data-protection";
import { getGuestDetails, listGuests, updateGuest } from "@/lib/services/guests";
import { setPushSenderForTests } from "@/lib/services/push";
import { getReservation } from "@/lib/services/reservations";
import { confirmTwoStep, deviceLabel, disableTwoStep, listExports, listLogins, maskIp, recordExport, startTwoStep, twoStepStatus } from "@/lib/services/security";
import { createProperty, createReservationRow, createTenant, resetDatabase } from "./helpers";

const raw = (id: string) =>
  db.$queryRaw<{ email: string | null; phone: string | null; idNumber: string | null; emailHash: string | null }[]>`SELECT email, phone, "idNumber", "emailHash" FROM "Guest" WHERE id = ${id}`.then((r) => r[0]);

describe("encryption of guest data", () => {
  let ctx: OrgContext;
  beforeAll(async () => {
    await resetDatabase();
    ctx = await createTenant("Enc");
  });

  it("field helpers round-trip, pass plain values through and leave Prisma null markers alone", () => {
    const e = encryptField("AB123456");
    expect(e).toMatch(/^enc:v1:a:/);
    expect(e).not.toContain("AB123456");
    expect(encryptField(e)).toBe(e);
    expect(decryptField(e)).toBe("AB123456");
    expect(decryptField("plain")).toBe("plain");
    expect(encryptField(null)).toBeNull();
    const j = encryptJson({ fields: [["Phone", "+30 697"]] });
    expect(JSON.stringify(j)).not.toContain("697");
    expect(decryptJson(j)).toEqual({ fields: [["Phone", "+30 697"]] });
    expect(phoneIndex("+30 697 123 4567")).toBe(phoneIndex("6971234567"));
    expect(emailIndex(" Anna@Example.com ")).toBe(emailIndex("anna@example.com"));
  });

  it("guests are stored encrypted, read back in the clear and found by exact email or phone", async () => {
    const g = await db.guest.create({ data: { organizationId: ctx.organizationId, firstName: "Anna", lastName: "Schmidt", email: "anna@example.com", phone: "+49 170 1234567", idNumber: "C01X00T47" } });
    const stored = await raw(g.id);
    expect(stored.email).toMatch(/^enc:v1:/);
    expect(stored.idNumber).toMatch(/^enc:v1:/);
    expect(stored.emailHash).toBe(emailIndex("anna@example.com"));
    expect(g.idNumber).toBe("C01X00T47");
    const found = await db.guest.findUniqueOrThrow({ where: { id: g.id } });
    expect(found).toMatchObject({ email: "anna@example.com", phone: "+49 170 1234567", idNumber: "C01X00T47" });

    expect((await listGuests(ctx, { q: "ANNA@example.com" })).map((x) => x.id)).toEqual([g.id]);
    expect((await listGuests(ctx, { q: "0170 1234567" })).map((x) => x.id)).toEqual([g.id]);
    expect((await listGuests(ctx, { q: "Schmi" })).map((x) => x.id)).toEqual([g.id]);
    expect(await listGuests(ctx, { q: "other@example.com" })).toEqual([]);

    // Nested reads (reservation → guest) are decrypted too.
    const p = await createProperty(ctx);
    const r = await createReservationRow(ctx, { propertyId: p.id, guestId: g.id, checkIn: "2026-05-01", checkOut: "2026-05-03" });
    expect((await getReservation(ctx, r.id)).guestPhone).toBe("+49 170 1234567");
  });

  it("the daily job encrypts rows written in the clear (before this change)", async () => {
    const g = await db.guest.create({ data: { organizationId: ctx.organizationId, firstName: "Old", lastName: "Row" } });
    await db.$executeRaw`UPDATE "Guest" SET email = 'old@example.com', "idNumber" = 'X999' WHERE id = ${g.id}`;
    expect((await raw(g.id)).email).toBe("old@example.com");
    const res = await reencryptGuestData();
    expect(res.guests).toBeGreaterThanOrEqual(1);
    const after = await raw(g.id);
    expect(after.email).toMatch(/^enc:v1:/);
    expect(after.emailHash).toBe(emailIndex("old@example.com"));
    expect((await db.guest.findUniqueOrThrow({ where: { id: g.id } })).idNumber).toBe("X999");
    expect((await reencryptGuestData()).guests).toBe(0);
  });
});

describe("ID numbers are deleted when no longer needed", () => {
  it("30 days after check-out, once declared, not required or free", async () => {
    await resetDatabase();
    const ctx = await createTenant("Ret");
    const p = await createProperty(ctx);
    const now = new Date("2026-10-18T08:00:00Z");
    const longAgo = new Date("2026-08-01T00:00:00Z");
    const guest = async (name: string) => db.guest.create({ data: { organizationId: ctx.organizationId, firstName: name, lastName: "G", idNumber: `ID-${name}` } });
    const stay = async (guestId: string, checkOut: string, data: Record<string, unknown> = {}) => {
      const r = await createReservationRow(ctx, { propertyId: p.id, guestId, checkIn: "2026-07-01", checkOut });
      await db.reservation.update({ where: { id: r.id }, data });
    };
    const declaredOld = await guest("declaredOld");
    await stay(declaredOld.id, "2026-08-10", { declarationStatus: "DECLARED" });
    const pendingOld = await guest("pendingOld");
    await stay(pendingOld.id, "2026-08-10");
    const declaredRecent = await guest("declaredRecent");
    await stay(declaredRecent.id, "2026-10-01", { declarationStatus: "DECLARED" });
    const freeOld = await guest("freeOld");
    await stay(freeOld.id, "2026-08-10", { complimentary: true });
    const noStay = await guest("noStay");
    await db.$executeRaw`UPDATE "Guest" SET "updatedAt" = ${longAgo}`;

    expect(await purgeOldIdNumbers(now)).toEqual({ cleared: 2 });
    const ids = async (id: string) => (await db.guest.findUniqueOrThrow({ where: { id } })).idNumber;
    expect(await ids(declaredOld.id)).toBeNull();
    expect(await ids(freeOld.id)).toBeNull();
    expect(await ids(pendingOld.id)).toBe("ID-pendingOld");
    expect(await ids(declaredRecent.id)).toBe("ID-declaredRecent");
    expect(await ids(noStay.id)).toBe("ID-noStay");
  });
});

describe("team members do not see guests' details", () => {
  it("contact details, ID and notes are hidden from members and kept when they edit", async () => {
    await resetDatabase();
    const owner = await createTenant("Team");
    const user = await db.user.create({ data: { email: `cleaner${Date.now()}@test.local`, passwordHash: "x" } });
    await db.organizationMember.create({ data: { organizationId: owner.organizationId, userId: user.id, role: "MEMBER" } });
    const member: OrgContext = { userId: user.id, organizationId: owner.organizationId, role: "MEMBER" };
    const g = await db.guest.create({ data: { organizationId: owner.organizationId, firstName: "Maria", lastName: "K", email: "m@example.com", phone: "6900000000", idNumber: "AK123", notes: "door code 1234" } });
    const p = await createProperty(owner);
    const r = await createReservationRow(owner, { propertyId: p.id, guestId: g.id, checkIn: "2026-05-01", checkOut: "2026-05-03" });

    const seen = (await listGuests(member))[0];
    expect(seen).toMatchObject({ fullName: "Maria K", email: null, phone: null, idNumber: null, notes: null });
    expect((await getGuestDetails(member, g.id)).reservations[0]).toMatchObject({ guestEmail: null, guestPhone: null });
    expect(await getReservation(member, r.id)).toMatchObject({ guestName: "Maria K", guestEmail: null, guestPhone: null });
    expect(await getReservation(owner, r.id)).toMatchObject({ guestEmail: "m@example.com" });

    // A member's form has the hidden fields empty: they must not wipe them.
    await updateGuest(member, g.id, { firstName: "Mary", email: "", phone: "", idNumber: "", notes: "" });
    expect(await db.guest.findUniqueOrThrow({ where: { id: g.id } })).toMatchObject({ firstName: "Mary", email: "m@example.com", idNumber: "AK123", notes: "door code 1234" });
  });
});

describe("two-step sign-in", () => {
  const email = `two${Date.now()}@test.local`;
  let userId: string;
  const emails: EmailMessage[] = [];
  const pushes: string[] = [];

  beforeAll(async () => {
    await resetDatabase();
    userId = (await db.user.create({ data: { email, passwordHash: await bcrypt.hash("pass-1234", 4) } })).id;
    setEmailSenderForTests(async (m) => void emails.push(m));
    setPushSenderForTests(async (_s, payload) => void pushes.push(payload));
  });
  beforeEach(() => {
    emails.length = 0;
  });

  it("codes match the RFC 6238 test vector", () => {
    const secret = base32Encode(Buffer.from("12345678901234567890"));
    expect(totpCode(secret, 1)).toBe("287082");
    expect(verifyTotp(secret, "287 082", 59_000)).toBe(1);
    expect(verifyTotp(secret, "287082", 59_000, 1)).toBeNull();
    expect(verifyTotp(secret, "000000", 59_000)).toBeNull();
  });

  it("turning it on needs a code; then sign-in needs one, each code works once, recovery codes too", async () => {
    const { secret, uri } = await startTwoStep(userId);
    expect(uri).toContain(`secret=${secret}`);
    expect(((await db.$queryRaw<{ totpSecret: string }[]>`SELECT "totpSecret" FROM "User" WHERE id = ${userId}`)[0]).totpSecret).toMatch(/^enc:v1:/);
    await expect(confirmTwoStep(userId, { code: "000000" })).rejects.toThrow(/δεν είναι σωστός/);
    const now = Date.now();
    const step = Math.floor(now / 30_000);
    const { recoveryCodes } = await confirmTwoStep(userId, { code: totpCode(secret, step) }, now);
    expect(recoveryCodes).toHaveLength(8);
    expect(await twoStepStatus(userId)).toMatchObject({ enabled: true, recoveryCodesLeft: 8 });

    await expect(verifyCredentials(email, "pass-1234")).rejects.toEqual(new SecondStepError("totp"));
    await expect(verifyCredentials(email, "pass-1234", { code: "123456" })).rejects.toEqual(new SecondStepError("totp-invalid"));
    // The code used to turn it on cannot be used again.
    await expect(verifyCredentials(email, "pass-1234", { code: totpCode(secret, step) })).rejects.toEqual(new SecondStepError("totp-invalid"));
    // Wrong password: no hint that two-step is on.
    expect(await verifyCredentials(email, "wrong", { code: "123456" })).toBeNull();

    const next = totpCode(secret, step + 1);
    expect(await verifyCredentials(email, "pass-1234", { code: next })).toMatchObject({ email });
    await expect(verifyCredentials(email, "pass-1234", { code: next })).rejects.toEqual(new SecondStepError("totp-invalid"));

    expect(await verifyCredentials(email, "pass-1234", { code: recoveryCodes[0].toLowerCase() })).toMatchObject({ email });
    await expect(verifyCredentials(email, "pass-1234", { code: recoveryCodes[0] })).rejects.toEqual(new SecondStepError("totp-invalid"));
    expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).totpRecovery).not.toContain(hashRecoveryCode(recoveryCodes[0]));

    await expect(disableTwoStep(userId, { password: "wrong" })).rejects.toThrow(/Λάθος κωδικός/);
    await disableTwoStep(userId, { password: "pass-1234" });
    expect(await verifyCredentials(email, "pass-1234")).toMatchObject({ email });
  });

  it("sign-ins are listed; a new device sends an email and a push, a known one does not", async () => {
    await db.securityEvent.deleteMany({ where: { userId } });
    await db.rateLimit.deleteMany(); // the previous test used up the 10 attempts
    await db.pushSubscription.create({ data: { userId, endpoint: "https://push.example/1", p256dh: "k", auth: "a" } });
    request.userAgent = "Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile Safari/537.36";
    await verifyCredentials(email, "pass-1234", { client: "web" }); // first ever: no alert
    await verifyCredentials(email, "pass-1234", { client: "web" }); // same device: no alert
    expect(emails).toHaveLength(0);
    request.userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/131.0";
    pushes.length = 0;
    await verifyCredentials(email, "pass-1234", { client: "web" });
    expect(emails).toHaveLength(1);
    expect(emails[0].text).toContain("Firefox · Windows");
    expect(emails[0].text).toContain("203.0.113.x");
    expect(pushes).toHaveLength(1);
    const logins = await listLogins(userId);
    expect(logins.map((l) => l.device)).toEqual(["Firefox · Windows", "Chrome · Android", "Chrome · Android"]);
  });

  it("device labels and masked addresses", () => {
    expect(deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Version/17.0 Mobile/15E148 Safari/604.1")).toBe("Safari · iPhone");
    expect(deviceLabel("okhttp/4.9", "app")).toBe("Εφαρμογή κινητού");
    expect(maskIp("2a02:587:1234:5678::1")).toBe("2a02:587:1234::");
    expect(maskIp("unknown")).toBeNull();
  });
});

describe("downloads of guest data are logged", () => {
  it("lists who downloaded what", async () => {
    await resetDatabase();
    const ctx = await createTenant("Log");
    await recordExport(ctx, "accountant", { year: 2026 });
    expect(await listExports(ctx)).toEqual([expect.objectContaining({ who: "Log user", what: "Πακέτο λογιστή (Excel)", year: 2026 })]);
    const other = await createTenant("Other");
    expect(await listExports(other)).toEqual([]);
  });
});