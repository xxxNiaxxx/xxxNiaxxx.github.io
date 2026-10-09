import bcrypt from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { providerFor } from "@/lib/ai/provider";
import { db } from "@/lib/db";
import { refreshDemo, seedDemo } from "@/lib/demo-seed";
import { type EmailMessage, sendEmail, setEmailSenderForTests } from "@/lib/email";
import { deleteAccount } from "@/lib/services/account-deletion";
import { createInvitation } from "@/lib/services/invitations";
import { changePassword, signOutEverywhere } from "@/lib/services/settings";
import { createTenant, resetDatabase } from "./helpers";

describe("the shared demo", () => {
  let ownerId: string;
  let organizationId: string;

  beforeAll(async () => {
    await resetDatabase();
    await seedDemo(db, { password: "demo1234" });
    const owner = await db.user.findUniqueOrThrow({ where: { email: "demo@demo-hospitality.test" } });
    ownerId = owner.id;
    organizationId = (await db.organization.findFirstOrThrow({ where: { isDemo: true } })).id;
  }, 60_000);
  afterAll(() => {
    delete process.env.AI_API_KEY;
    setEmailSenderForTests(null);
  });

  it("is flagged, free and full of data", async () => {
    const org = await db.organization.findUniqueOrThrow({ where: { id: organizationId }, include: { _count: { select: { properties: true, reservations: true } } } });
    expect(org.isDemo && org.billingExempt).toBe(true);
    expect(org._count.properties).toBeGreaterThan(0);
    expect(org._count.reservations).toBeGreaterThan(10);
  });

  it("visitors cannot lock others out, delete it or reach real people", async () => {
    const ctx = { userId: ownerId, organizationId, role: "OWNER" as const };
    await expect(changePassword(ownerId, { currentPassword: "demo1234", newPassword: "something-else" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(signOutEverywhere(ownerId)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(deleteAccount(ownerId, { password: "demo1234" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createInvitation(ctx, { email: "someone@example.com", role: "MEMBER" })).rejects.toMatchObject({ code: "FORBIDDEN" });

    const sent: EmailMessage[] = [];
    setEmailSenderForTests(async (m) => void sent.push(m));
    expect(await sendEmail({ to: "demo@demo-hospitality.test", subject: "x", text: "x" })).toBe(false);
    await sendEmail({ to: ["demo@demo-hospitality.test", "real@example.com"], subject: "x", text: "x" });
    expect(sent.map((m) => m.to)).toEqual([["real@example.com"]]);
  });

  it("every night it is back to the original data, with the same password, and nothing else is touched", async () => {
    // A real customer who happens to use the same name.
    const other = await createTenant("Demo Hospitality");
    const before = await db.property.count({ where: { organizationId } });
    await db.property.deleteMany({ where: { organizationId, reservations: { none: {} } } });
    await db.reservation.deleteMany({ where: { organizationId } });
    await db.property.deleteMany({ where: { organizationId } });
    const hash = (await db.user.findUniqueOrThrow({ where: { id: ownerId } })).passwordHash;

    await refreshDemo(db);
    const org = await db.organization.findFirstOrThrow({ where: { isDemo: true } });
    expect(await db.property.count({ where: { organizationId: org.id } })).toBe(before);
    const owner = await db.user.findUniqueOrThrow({ where: { email: "demo@demo-hospitality.test" } });
    expect(owner.passwordHash).toBe(hash);
    expect(await bcrypt.compare("demo1234", owner.passwordHash)).toBe(true);
    expect(await db.organization.findUnique({ where: { id: other.organizationId } })).not.toBeNull();
    organizationId = org.id;
  }, 60_000);

  it("has a small daily AI allowance; after it the offline assistant answers", async () => {
    process.env.AI_API_KEY = "test-key";
    const results = [];
    for (let i = 0; i < 31; i++) results.push(await providerFor({ organizationId }));
    expect(results.slice(0, 30).every((p) => p !== null)).toBe(true);
    expect(results[30]).toBeNull();
    const normal = await createTenant("Normal");
    expect(await providerFor(normal)).not.toBeNull();
  });
});
