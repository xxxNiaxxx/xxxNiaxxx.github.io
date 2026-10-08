import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { type EmailMessage, setEmailSenderForTests } from "@/lib/email";
import { registerAccount } from "@/lib/services/accounts";
import {
  approveEntry,
  deleteEntry,
  getWaitlistAccess,
  isRegistrationOpen,
  joinWaitlist,
  rejectEntry,
  setRegistrationOpen,
  waitlistCsv,
} from "@/lib/services/waitlist";

const ORIGIN = "https://app.test";
let sent: EmailMessage[] = [];
let n = 0;
const newEmail = () => `tester${Date.now().toString(36)}${n++}@gmail.com`;
const tokenOf = (path: string) => new URL(path, ORIGIN).searchParams.get("access")!;

const form = (over: Record<string, unknown> = {}) => ({
  name: "Νίκος Παπαδόπουλος",
  email: newEmail(),
  phone: "",
  city: "Χανιά",
  propertiesCount: "2",
  platforms: ["BOOKING_COM", "AIRBNB"],
  regime: "INDIVIDUAL",
  device: "ANDROID",
  playEmail: "",
  message: "",
  consent: true,
  ...over,
});

describe("waitlist", () => {
  beforeAll(async () => {
    process.env.ADMIN_EMAILS = "owner@test.local";
    setEmailSenderForTests(async (m) => void sent.push(m));
    await db.waitlistEntry.deleteMany();
    await db.appSetting.deleteMany();
  });
  afterAll(() => {
    setEmailSenderForTests(null);
    delete process.env.ADMIN_EMAILS;
  });
  beforeEach(() => {
    sent = [];
  });

  it("registration is closed by default: a new organization needs an approved link", async () => {
    expect(await isRegistrationOpen()).toBe(false);
    await expect(registerAccount({ name: "X", email: newEmail(), password: "password123", organizationName: "X" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await setRegistrationOpen(true);
    await expect(registerAccount({ name: "Y", email: newEmail(), password: "password123", organizationName: "Y" })).resolves.toMatchObject({ organizationId: expect.any(String) });
    await setRegistrationOpen(false);
  });

  it("joining needs consent and emails the applicant and the admins", async () => {
    await expect(joinWaitlist(form({ consent: false }), ORIGIN)).rejects.toMatchObject({ name: "ZodError" });
    const data = form();
    await joinWaitlist(data, ORIGIN);
    const entry = await db.waitlistEntry.findUniqueOrThrow({ where: { email: data.email } });
    expect(entry).toMatchObject({ status: "PENDING", propertiesCount: 2, platforms: ["BOOKING_COM", "AIRBNB"], device: "ANDROID", playEmail: data.email });
    expect(sent.map((m) => m.to)).toEqual([data.email, ["owner@test.local"]]);
    expect(sent[0].text).toContain("δωρεάν μέχρι το τέλος του 2026");
    expect(sent[1].action?.url).toBe(`${ORIGIN}/admin/waitlist`);

    // Asking again updates the same entry and sends nothing new.
    sent = [];
    await joinWaitlist({ ...data, city: "Ρέθυμνο" }, ORIGIN);
    expect(await db.waitlistEntry.count({ where: { email: data.email } })).toBe(1);
    expect((await db.waitlistEntry.findUniqueOrThrow({ where: { email: data.email } })).city).toBe("Ρέθυμνο");
    expect(sent).toHaveLength(0);
  });

  it("approval emails a personal link that creates the account once, only for that email", async () => {
    const data = form({ device: "IPHONE" });
    await joinWaitlist(data, ORIGIN);
    const entry = await db.waitlistEntry.findUniqueOrThrow({ where: { email: data.email } });
    expect(entry.playEmail).toBeNull();
    sent = [];

    const { path, emailed } = await approveEntry(entry.id, ORIGIN);
    expect(emailed).toBe(true);
    expect(sent[0]).toMatchObject({ to: data.email, action: { url: `${ORIGIN}${path}` } });
    const token = tokenOf(path);
    expect(await getWaitlistAccess(token)).toMatchObject({ email: data.email, status: "VALID" });

    await expect(registerAccount({ name: "Other", email: newEmail(), password: "password123", organizationName: "O", access: token })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const { organizationId, userId } = await registerAccount({ name: data.name, email: data.email, password: "password123", organizationName: "Νίκος Stays", access: token });
    expect(await db.organizationMember.findFirst({ where: { organizationId, userId, role: "OWNER" } })).not.toBeNull();
    expect(await db.waitlistEntry.findUniqueOrThrow({ where: { id: entry.id } })).toMatchObject({ status: "REGISTERED", userId });
    expect(await getWaitlistAccess(token)).toMatchObject({ status: "USED" });
    await expect(approveEntry(entry.id, ORIGIN)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("links expire, a new link replaces the old one and rejection withdraws it", async () => {
    const data = form();
    await joinWaitlist(data, ORIGIN);
    const entry = await db.waitlistEntry.findUniqueOrThrow({ where: { email: data.email } });
    const past = new Date(Date.now() - 20 * 86_400_000);
    const old = tokenOf((await approveEntry(entry.id, ORIGIN, past)).path);
    expect(await getWaitlistAccess(old)).toMatchObject({ status: "EXPIRED" });
    await expect(registerAccount({ name: "N", email: data.email, password: "password123", organizationName: "N", access: old })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const fresh = tokenOf((await approveEntry(entry.id, ORIGIN)).path);
    expect(await getWaitlistAccess(old)).toBeNull();
    expect(await getWaitlistAccess(fresh)).toMatchObject({ status: "VALID" });
    await rejectEntry(entry.id);
    expect(await getWaitlistAccess(fresh)).toBeNull();
  });

  it("exports a CSV that Excel opens safely, and deletes on request", async () => {
    const data = form({ name: "=HYPERLINK(\"x\")", message: "Γεια, σας" });
    await joinWaitlist(data, ORIGIN);
    const csv = await waitlistCsv();
    expect(csv.startsWith("﻿Ημερομηνία,Όνομα,Email")).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain(`"Γεια, σας"`);
    const entry = await db.waitlistEntry.findUniqueOrThrow({ where: { email: data.email } });
    await deleteEntry(entry.id);
    expect(await db.waitlistEntry.findUnique({ where: { id: entry.id } })).toBeNull();
  });
});
