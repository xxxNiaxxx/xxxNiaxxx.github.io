import { NextResponse, type NextRequest } from "next/server";
import { syncAllFeeds } from "@/lib/services/calendar-feeds";

/** Vercel Cron (vercel.json): syncs every iCal feed. Requires `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json({ data: await syncAllFeeds() });
}

export const maxDuration = 60;
