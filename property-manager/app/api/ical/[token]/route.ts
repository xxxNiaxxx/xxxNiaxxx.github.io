import { NextResponse, type NextRequest } from "next/server";
import { exportIcs } from "@/lib/services/calendar-feeds";

/** Public, secret-link iCal of a property's stays — added to Airbnb / Booking.com to block dates. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ics = await exportIcs(token.replace(/\.ics$/i, ""));
  if (!ics) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" } });
}
