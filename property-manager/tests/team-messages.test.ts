import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { type EmailMessage, setEmailSenderForTests } from "@/lib/email";
import { setPushSenderForTests } from "@/lib/services/push";
import { lastTeamMessageAt, markTeamMessageSeen, personalize, sendTeamMessage, unseenTeamMessages } from "@/lib/services/team-messages";
import { createTenant, resetDatabase } from "./helpers";

describe("messages from the team", () => {
  const sent: EmailMessage[] = [];
  beforeAll(async () => {
    await resetDatabase();
    setEmailSenderForTests(async (m) => void sent.push(m));
    setPushSenderForTests(async () => {});
  });
  afterAll(() => {
    setEmailSenderForTests(null);
    setPushSenderForTests(null);
  });

  it("fills in the first name, or drops it cleanly", () => {
    expect(personalize("Γεια σας [Όνομα]! 🙂", "Μαρία Παπαδοπούλου")).toBe("Γεια σας Μαρία! 🙂");
    expect(personalize("Γεια σας [Όνομα]! 🙂", null)).toBe("Γεια σας! 🙂");
    expect(["Αλέξης", "Κώστας", "Νίκος", "Ελένη", "Dimitris", "Τρύφωνας"].map((n) => personalize("[Όνομα]", n))).toEqual(["Αλέξη", "Κώστα", "Νίκο", "Ελένη", "Dimitris", "Τρύφωνα"]);
  });

  it("emails each user, shows it on their home page until they close it", async () => {
    const a = await createTenant("A");
    const b = await createTenant("B");
    await db.user.update({ where: { id: a.userId }, data: { name: "Ελένη Κ." } });
    await expect(sendTeamMessage({ userIds: [], body: "Γεια σας" }, "https://app.test")).rejects.toMatchObject({ name: "ZodError" });
    const r = await sendTeamMessage({ userIds: [a.userId, b.userId, a.userId], body: "Γεια σας [Όνομα]! Πώς πάει;\n\nΑπό την ομάδα του Βραχυχρόνια.ai" }, "https://app.test");
    expect(r).toEqual({ sent: 2, emailed: 2 });
    expect(sent.map((m) => m.subject)).toEqual(["Μήνυμα από την ομάδα του Βραχυχρόνια.ai", "Μήνυμα από την ομάδα του Βραχυχρόνια.ai"]);
    const mine = await unseenTeamMessages(a.userId);
    expect(mine).toHaveLength(1);
    expect(mine[0].body.startsWith("Γεια σας Ελένη! Πώς πάει;")).toBe(true);
    expect((await lastTeamMessageAt([a.userId, b.userId])).size).toBe(2);

    await expect(markTeamMessageSeen(b.userId, mine[0].id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await markTeamMessageSeen(a.userId, mine[0].id);
    expect(await unseenTeamMessages(a.userId)).toEqual([]);
    expect(await unseenTeamMessages(b.userId)).toHaveLength(1);
  });
});
