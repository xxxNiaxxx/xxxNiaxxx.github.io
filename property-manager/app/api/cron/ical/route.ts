import { NextResponse, type NextRequest } from "next/server";
import { syncAllFeeds } from "@/lib/services/calendar-feeds";
import { sendScheduledEmails } from "@/lib/services/notifications";

/**
 * Vercel Cron (vercel.json), every morning: syncs every iCal feed, then sends
 * the reminder emails (and, early in the month, the monthly reports).
 * Requires `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  const calendars = await syncAllFeeds();
  const emails = await sendScheduledEmails();
  return NextResponse.json({ data: { calendars, emails } });
}

export const maxDuration = 60;
