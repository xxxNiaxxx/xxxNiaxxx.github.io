import webpush from "web-push";
import { z } from "zod";
import { db } from "@/lib/db";
import { platformAdminEmails } from "@/lib/email";
import { AppError } from "@/lib/errors";

/**
 * Web Push: notifications on the phone (Chrome on Android shows them even
 * when the browser is closed). The VAPID keys are made once and kept in
 * AppSetting, so nothing needs setting up; VAPID_PUBLIC_KEY and
 * VAPID_PRIVATE_KEY override them.
 */
const KEYS = "vapidKeys";
type Keys = { publicKey: string; privateKey: string };

export async function vapidKeys(): Promise<Keys> {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  const row = await db.appSetting.findUnique({ where: { key: KEYS } });
  if (row) return row.value as Keys;
  const { publicKey, privateKey } = webpush.generateVAPIDKeys();
  const keys = { publicKey, privateKey };
  // Two first requests at once: keep whichever was saved first.
  await db.appSetting.upsert({ where: { key: KEYS }, create: { key: KEYS, value: keys }, update: {} });
  return (await db.appSetting.findUniqueOrThrow({ where: { key: KEYS } })).value as Keys;
}

const subscriptionInput = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

/** Saves this browser for the user (a browser moving to another user moves with it). */
export async function savePushSubscription(userId: string, input: unknown, userAgent: string | null) {
  const { endpoint, keys } = subscriptionInput.parse(input);
  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent: userAgent?.slice(0, 300) ?? null },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth, userAgent: userAgent?.slice(0, 300) ?? null },
  });
  return { subscribed: true };
}

export async function removePushSubscription(userId: string, endpoint: string) {
  await db.pushSubscription.deleteMany({ where: { userId, endpoint } });
  return { subscribed: false };
}

export type PushMessage = { title: string; body: string; url: string; tag?: string };
type Sender = (sub: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string) => Promise<unknown>;
let senderOverride: Sender | null = null;
/** Tests use a fake sender. */
export function setPushSenderForTests(fn: Sender | null) {
  senderOverride = fn;
}

/** Sends to every browser of these users; browsers that are gone (404/410) are forgotten. Returns how many got it. */
export async function sendPush(userIds: string[], message: PushMessage, now = new Date()) {
  if (!userIds.length) return 0;
  const subs = await db.pushSubscription.findMany({ where: { userId: { in: userIds } } });
  if (!subs.length) return 0;
  const keys = await vapidKeys();
  const subject = `mailto:${platformAdminEmails()[0] ?? "noreply@vrachychronia.app"}`;
  const payload = JSON.stringify(message);
  let delivered = 0;
  for (const s of subs) {
    const target = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
    try {
      if (senderOverride) await senderOverride(target, payload);
      else await webpush.sendNotification(target, payload, { vapidDetails: { subject, publicKey: keys.publicKey, privateKey: keys.privateKey }, TTL: 24 * 3600 });
      await db.pushSubscription.update({ where: { id: s.id }, data: { lastSentAt: now } });
      delivered++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
      else console.error("push failed", status ?? e);
    }
  }
  return delivered;
}

/** To the app's administrators (ADMIN_EMAILS), e.g. a new waitlist application. */
export async function pushToAdmins(message: PushMessage) {
  const emails = platformAdminEmails();
  if (!emails.length) return 0;
  const users = await db.user.findMany({ where: { email: { in: emails, mode: "insensitive" } }, select: { id: true } });
  return sendPush(users.map((u) => u.id), message);
}

/** «Δοκιμαστική ειδοποίηση» from the settings card. */
export async function sendTestPush(userId: string) {
  const sent = await sendPush([userId], { title: "Βραχυχρόνια.ai", body: "Οι ειδοποιήσεις λειτουργούν σε αυτή τη συσκευή. 🎉", url: "/dashboard", tag: "test" });
  if (!sent) throw new AppError("BAD_REQUEST", "Δεν βρέθηκε συσκευή με ενεργές ειδοποιήσεις. Πατήστε πρώτα «Ενεργοποίηση».");
  return { sent };
}
