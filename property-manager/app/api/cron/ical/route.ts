import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { refreshDemo } from "@/lib/demo-seed";
import { reportError } from "@/lib/monitoring/errors";
import { syncAllFeeds } from "@/lib/services/calendar-feeds";
import { sendScheduledEmails } from "@/lib/services/notifications";
import { sendFreePeriodReminders, syncSubscriptionQuantities } from "@/lib/services/billing";
import { appOrigin } from "@/lib/request";

/** Runs a step; a failure is reported to the administrators and the other steps still run. */
async function step<T>(name: string, fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (e) {
    await reportError(e, { source: "cron", path: name });
    return { failed: true };
  }
}

/**
 * Vercel Cron (vercel.json), every morning: syncs every iCal feed, sends the
 * reminder emails (and, early in the month, the monthly reports) and updates
 * the number of paid properties on subscriptions, and resets the shared demo.
 * Requires `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  const calendars = await step("calendars", syncAllFeeds);
  const emails = await step("emails", () => sendScheduledEmails());
  const billing = await step("billing", () => syncSubscriptionQuantities());
  const billingReminders = await step("billing-reminders", async () => sendFreePeriodReminders(await appOrigin()));
  const demo = await step("demo", () => refreshDemo(db));
  return NextResponse.json({ data: { calendars, emails, billing, billingReminders, demo } });
}

export const maxDuration = 60;
