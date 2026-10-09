import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * For an uptime monitor (e.g. UptimeRobot): 200 when the app and the database
 * answer, 503 otherwise. Reveals nothing else.
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export const dynamic = "force-dynamic";
