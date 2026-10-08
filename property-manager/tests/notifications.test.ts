import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { type EmailMessage, setEmailSenderForTests } from "@/lib/email";
import type { OrgContext } from "@/lib/permissions";
import { monthlyReport, reminderItems, sendScheduledEmails } from "@/lib/services/notifications";
import { createReservation } from "@/lib/services/reservations";
import { createGuest, createTenant, resetDatabase } from "./helpers";

describe("reminder and monthly emails", () => {
  let ctx: OrgContext;
  const sent: EmailMessage[] = [];

  beforeAll(async () => {
    await resetDatabase();
    setEmailSenderForTests(async (m) => void sent.push(m));
    ctx = await createTenant("Mails");
    const property = await db.property.create({ data: { organizationId: ctx.organizationId, name: "Studio", city: "Αθήνα", country: "Ελλάδα", basePrice: 80, maxGuests: 2, ama: "00001111111" } });
    const guest = await createGuest(ctx, "Eva", "Novak");
    // Stay of September, not declared: deadline 20/10.
    await createReservation(ctx, { propertyId: property.id, guestId: guest.id, guestsCount: 2, checkIn: "2026-09-25", checkOut: "2026-09-28", totalAmount: 240, source: "BOOKING_COM" });
  });
  afterAll(() => setEmailSenderForTests(null));

  it("lists what is due soon", async () => {
    expect(await reminderItems(ctx, new Date("2026-10-05T07:00:00Z"))).toEqual([]); // 15 days left: nothing yet
    const items = await reminderItems(ctx, new Date("2026-10-18T07:00:00Z"));
    expect(items).toEqual([expect.stringContaining("δήλωση διαμονής: Eva Novak")]);
    expect((await reminderItems(ctx, new Date("2026-10-22T07:00:00Z")))[0]).toMatch(/^ΕΚΠΡΟΘΕΣΜΗ/);
  });

  it("sends at most one reminder a day, and the monthly report early in the month", async () => {
    sent.length = 0;
    const day = new Date("2026-10-02T05:00:00Z");
    expect(await sendScheduledEmails(day)).toMatchObject({ reminders: 0, reports: 1 }); // nothing due on 2/10, but September's report
    expect(sent[0].subject).toContain("ο Σεπτέμβριος 2026 με μια ματιά");
    expect(sent[0].text).toContain("Έσοδα (τιμή δωματίων): 240,00 €");

    const due = new Date("2026-10-19T05:00:00Z");
    expect(await sendScheduledEmails(due)).toMatchObject({ reminders: 1, reports: 0 });
    expect(await sendScheduledEmails(due)).toMatchObject({ reminders: 0 }); // same day again
    expect(sent.at(-1)!.subject).toBe("Mails: 1 εκκρεμότητα για σήμερα");

    await db.organization.update({ where: { id: ctx.organizationId }, data: { emailReminders: false } });
    expect(await sendScheduledEmails(new Date("2026-10-20T05:00:00Z"))).toMatchObject({ organizations: 0 });
  });

  it("monthly figures", async () => {
    expect(await monthlyReport(ctx, "2026-09", new Date("2026-10-02T05:00:00Z"))).toMatchObject({ stays: 1, revenue: 240, climateFee: 24 });
  });
});
