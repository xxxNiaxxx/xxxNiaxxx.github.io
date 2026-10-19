import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { setEmailSenderForTests, type EmailMessage } from "@/lib/email";
import { remindUnregistered } from "@/lib/services/waitlist";
import { sendWelcomeEmails, setFollowUpEmails, unsubscribe, unsubscribeToken, verifyUnsubscribeToken } from "@/lib/services/welcome-emails";
import { resetDatabase } from "./helpers";

const ORIGIN = "https://app.test";
const now = new Date("2026-10-19T07:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);
const emails: EmailMessage[] = [];

describe("welcome emails", () => {
  beforeAll(async () => {
    await resetDatabase();
    await db.appSetting.deleteMany();
    setEmailSenderForTests(async (m) => void emails.push(m));
  });
  afterAll(() => setEmailSenderForTests(null));
  beforeEach(() => {
    emails.length = 0;
  });

  const user = (email: string, createdAt: Date, extra: Record<string, unknown> = {}) =>
    db.user.create({ data: { email, name: "Μαρία Π.", passwordHash: "x", createdAt, ...extra } });

  it("nothing goes out until switched on in the admin page", async () => {
    await user("early@test.local", daysAgo(1.5));
    expect(await sendWelcomeEmails(ORIGIN, now)).toEqual({ sent: 0, off: true });
    expect(await remindUnregistered(ORIGIN, now)).toEqual({ sent: 0, off: true });
    expect(emails).toHaveLength(0);
    await db.user.deleteMany({ where: { email: "early@test.local" } });
    await setFollowUpEmails(true);
  });

  it("sends the step that is due, once, and skips missed steps", async () => {
    const fresh = await user("fresh@test.local", daysAgo(0.5));
    const day1 = await user("day1@test.local", daysAgo(1.2));
    const day4 = await user("day4@test.local", daysAgo(4));
    const old = await user("old@test.local", daysAgo(40));
    await user("demo@demo-hospitality.test", daysAgo(2));

    expect(await sendWelcomeEmails(ORIGIN, now)).toEqual({ sent: 2 });
    const to = (id: string) => emails.find((e) => e.to === id);
    expect(to("fresh@test.local")).toBeUndefined();
    expect(to("old@test.local")).toBeUndefined();
    expect(to("day1@test.local")?.subject).toMatch(/3 βήματα/);
    expect(to("day1@test.local")?.text).toContain("Γεια σας Μαρία,");
    expect(to("day1@test.local")?.text).toContain(`${ORIGIN}/unsubscribe/${unsubscribeToken(day1.id)}`);
    // 4 days old: gets the 3rd-day email, not the 1st.
    expect(to("day4@test.local")?.subject).toMatch(/1 λεπτό/);
    expect((await db.user.findUniqueOrThrow({ where: { id: day4.id } })).welcomeEmails).toBe(2);

    emails.length = 0;
    expect(await sendWelcomeEmails(ORIGIN, now)).toEqual({ sent: 0 });
    // 4 days later: the 7th-day email for the 8-day-old user, the 3rd-day one for the others.
    expect(await sendWelcomeEmails(ORIGIN, new Date(now.getTime() + 4 * 86_400_000))).toEqual({ sent: 3 });
    expect(to("day4@test.local")?.subject).toMatch(/Πώς σας φαίνεται/);
    expect(to("fresh@test.local")?.subject).toMatch(/1 λεπτό/);
    expect(to("day1@test.local")?.subject).toMatch(/1 λεπτό/);
    expect(emails.find((e) => e.to === old.email)).toBeUndefined();
    void fresh;
  });

  it("nothing after unsubscribing; a forged token does nothing", async () => {
    const u = await user("bye@test.local", daysAgo(1.5));
    expect(verifyUnsubscribeToken(`${u.id}.forged`)).toBeNull();
    expect(await unsubscribe(`${u.id}.forged`)).toBe(false);
    expect(await unsubscribe(unsubscribeToken(u.id))).toBe(true);
    await sendWelcomeEmails(ORIGIN, now);
    expect(emails.find((e) => e.to === "bye@test.local")).toBeUndefined();
  });

  it("without email set up, the step is retried the next day", async () => {
    const u = await user("later@test.local", daysAgo(1.5));
    setEmailSenderForTests(null);
    await sendWelcomeEmails(ORIGIN, now);
    expect((await db.user.findUniqueOrThrow({ where: { id: u.id } })).welcomeEmails).toBe(0);
    setEmailSenderForTests(async (m) => void emails.push(m));
  });
});

describe("waitlist reminder", () => {
  it("one reminder with a working new link, 2–14 days after approval, not after sign-up", async () => {
    await db.waitlistEntry.deleteMany();
    setEmailSenderForTests(async (m) => void emails.push(m));
    emails.length = 0;
    const entry = (email: string, approvedAt: Date, extra: Record<string, unknown> = {}) =>
      db.waitlistEntry.create({ data: { name: "Νίκος", email, consentAt: approvedAt, status: "APPROVED", approvedAt, tokenHash: `old-${email}`, ...extra } });
    await entry("due@test.local", daysAgo(3));
    await entry("tooearly@test.local", daysAgo(1));
    await entry("tooold@test.local", daysAgo(30));
    await entry("done@test.local", daysAgo(3), { status: "REGISTERED", registeredAt: daysAgo(2) });

    expect(await remindUnregistered(ORIGIN, now)).toEqual({ sent: 1 });
    expect(emails.map((e) => e.to)).toEqual(["due@test.local"]);
    const link = emails[0].action!.url;
    expect(link.startsWith(`${ORIGIN}/register?access=`)).toBe(true);
    const due = await db.waitlistEntry.findUniqueOrThrow({ where: { email: "due@test.local" } });
    expect(due.tokenHash).not.toBe("old-due@test.local");
    expect(due.reminderSentAt).not.toBeNull();
    expect(await remindUnregistered(ORIGIN, now)).toEqual({ sent: 0 });
  });
});
