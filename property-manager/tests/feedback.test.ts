import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { type EmailMessage, setEmailSenderForTests } from "@/lib/email";
import { listFeedback, setFeedbackResolved, submitFeedback } from "@/lib/services/feedback";
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
});
