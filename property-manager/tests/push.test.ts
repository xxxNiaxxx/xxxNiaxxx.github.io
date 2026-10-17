import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { setEmailSenderForTests } from "@/lib/email";
import { submitFeedback } from "@/lib/services/feedback";
import { removePushSubscription, savePushSubscription, sendPush, sendTestPush, setPushSenderForTests, vapidKeys } from "@/lib/services/push";
import { joinWaitlist } from "@/lib/services/waitlist";
import { createTenant, resetDatabase } from "./helpers";

const sub = (n: number) => ({ endpoint: `https://push.example.test/send/${n}`, keys: { p256dh: "BPublicKeyOfTheBrowser0123456789", auth: "authsecret123" } });

describe("push notifications", () => {
  const sent: { endpoint: string; payload: { title: string; body: string; url: string } }[] = [];
  let gone = new Set<string>();
  beforeAll(async () => {
    await resetDatabase();
    await db.appSetting.deleteMany({ where: { key: "vapidKeys" } });
    setEmailSenderForTests(async () => {});
    setPushSenderForTests(async (s, payload) => {
      if (gone.has(s.endpoint)) throw Object.assign(new Error("Gone"), { statusCode: 410 });
      sent.push({ endpoint: s.endpoint, payload: JSON.parse(payload) });
    });
  });
  afterAll(() => {
    setPushSenderForTests(null);
    setEmailSenderForTests(null);
    delete process.env.ADMIN_EMAILS;
  });

  it("makes the VAPID keys once and keeps them", async () => {
    const a = await vapidKeys();
    expect(a.publicKey.length).toBeGreaterThan(40);
    expect(await vapidKeys()).toEqual(a);
  });

  it("saves a browser, sends to it, forgets it when it is gone", async () => {
    const ctx = await createTenant("Push");
    await expect(sendTestPush(ctx.userId)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(savePushSubscription(ctx.userId, { endpoint: "not a url", keys: {} }, null)).rejects.toMatchObject({ name: "ZodError" });
    await savePushSubscription(ctx.userId, sub(1), "Chrome Android");
    await savePushSubscription(ctx.userId, sub(1), "Chrome Android"); // same browser again: one row
    await savePushSubscription(ctx.userId, sub(2), null);
    expect(await db.pushSubscription.count({ where: { userId: ctx.userId } })).toBe(2);

    expect(await sendTestPush(ctx.userId)).toEqual({ sent: 2 });
    expect(sent.at(-1)?.payload).toMatchObject({ title: "Βραχυχρόνια.ai", url: "/dashboard" });

    gone = new Set([sub(2).endpoint]);
    expect(await sendPush([ctx.userId], { title: "t", body: "b", url: "/x" })).toBe(1);
    expect(await db.pushSubscription.count({ where: { userId: ctx.userId } })).toBe(1);

    await removePushSubscription(ctx.userId, sub(1).endpoint);
    expect(await db.pushSubscription.count({ where: { userId: ctx.userId } })).toBe(0);
  });

  it("a new waitlist application and a new comment notify the administrators", async () => {
    const admin = await createTenant("Admin");
    const email = (await db.user.findUniqueOrThrow({ where: { id: admin.userId } })).email;
    process.env.ADMIN_EMAILS = email;
    await savePushSubscription(admin.userId, sub(3), null);
    sent.length = 0;
    await joinWaitlist({ name: "Νέα Οικοδέσποινα", email: "new-host@test.local", city: "Χανιά", consent: true }, "https://app.test");
    expect(sent).toHaveLength(1);
    expect(sent[0].payload).toMatchObject({ title: "Νέα αίτηση στη λίστα αναμονής", url: "/admin/waitlist" });
    expect(sent[0].payload.body).toContain("Χανιά");

    const user = await db.user.findUniqueOrThrow({ where: { id: admin.userId } });
    await submitFeedback(user, admin.organizationId, { kind: "IDEA", message: "Θέλω Viber" }, "https://app.test");
    expect(sent[1].payload).toMatchObject({ url: "/admin/feedback", body: "Θέλω Viber" });
  });
});
