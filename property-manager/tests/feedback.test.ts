import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { type EmailMessage, setEmailSenderForTests } from "@/lib/email";
import { listFeedback, markReplySeen, replyToFeedback, setFeedbackResolved, submitFeedback, unseenReplies } from "@/lib/services/feedback";
import { surveyAnswered } from "@/lib/services/surveys";
import { PRICE_SURVEY, surveyMessage } from "@/lib/surveys";
import { createTenant, resetDatabase } from "./helpers";

describe("feedback", () => {
  const sent: EmailMessage[] = [];
  beforeAll(async () => {
    await resetDatabase();
    await db.feedback.deleteMany();
    process.env.ADMIN_EMAILS = "boss@test.local";
    setEmailSenderForTests(async (m) => void sent.push(m));
  });
  afterAll(() => {
    setEmailSenderForTests(null);
    delete process.env.ADMIN_EMAILS;
  });

  it("stores the comment, emails the admins and can be marked done", async () => {
    const ctx = await createTenant("Fb");
    const user = await db.user.findUniqueOrThrow({ where: { id: ctx.userId } });
    await expect(submitFeedback(user, ctx.organizationId, { message: "no" }, "https://app.test")).rejects.toMatchObject({ name: "ZodError" });
    const { id } = await submitFeedback(user, ctx.organizationId, { kind: "BUG", message: "Το κουμπί δεν δουλεύει", page: "/tax" }, "https://app.test");
    expect(sent[0]).toMatchObject({ to: ["boss@test.local"], subject: expect.stringContaining("Πρόβλημα") });
    expect((await listFeedback())[0]).toMatchObject({ id, kindLabel: "Πρόβλημα", page: "/tax", client: "web", resolved: false });
    await setFeedbackResolved(id, true);
    expect((await listFeedback())[0].resolved).toBe(true);
  });

  it("records the home page survey answer once per user", async () => {
    const ctx = await createTenant("Survey");
    const user = await db.user.findUniqueOrThrow({ where: { id: ctx.userId } });
    expect(await surveyAnswered(user.id, PRICE_SURVEY.id)).toBe(false);
    expect(surveyMessage("Ίσως", "  ")).toBe("Ερώτηση τιμής (12 €/κατάλυμα/μήνα): Ίσως");
    await submitFeedback(user, ctx.organizationId, { message: surveyMessage("Ναι", "Θέλω και Viber"), page: PRICE_SURVEY.id }, "https://app.test");
    expect(await surveyAnswered(user.id, PRICE_SURVEY.id)).toBe(true);
    expect((await listFeedback())[0].message).toBe("Ερώτηση τιμής (12 €/κατάλυμα/μήνα): Ναι\n\nΘέλω και Viber");
  });

  it("the team answers: email to the user and a card on their home page until they close it", async () => {
    const ctx = await createTenant("Reply");
    const user = await db.user.findUniqueOrThrow({ where: { id: ctx.userId } });
    const other = await createTenant("Other");
    const { id } = await submitFeedback(user, ctx.organizationId, { kind: "IDEA", message: "Θέλω και Viber" }, "https://app.test");
    sent.length = 0;
    await expect(replyToFeedback(id, { reply: " " }, "https://app.test")).rejects.toMatchObject({ name: "ZodError" });
    expect(await replyToFeedback(id, { reply: "Ευχαριστούμε! Το βάζουμε στη λίστα." }, "https://app.test")).toEqual({ replied: true, emailed: true });
    expect(sent[0]).toMatchObject({ to: user.email, subject: "Απάντηση στο σχόλιό σας" });
    expect(sent[0].text).toContain("Από την ομάδα του Βραχυχρόνια.ai");
    expect(sent[0].text).toContain("Θέλω και Viber");
    expect((await listFeedback()).find((f) => f.id === id)).toMatchObject({ reply: "Ευχαριστούμε! Το βάζουμε στη λίστα.", resolved: true, replySeen: false });

    expect(await unseenReplies(user.id)).toMatchObject([{ id, reply: "Ευχαριστούμε! Το βάζουμε στη λίστα." }]);
    await expect(markReplySeen(other.userId, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await markReplySeen(user.id, id);
    expect(await unseenReplies(user.id)).toEqual([]);
    expect((await listFeedback()).find((f) => f.id === id)?.replySeen).toBe(true);
  });
});
