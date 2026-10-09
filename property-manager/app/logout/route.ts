import { NextResponse, type NextRequest } from "next/server";
import { requireOrganization } from "@/lib/auth";
import { signOut } from "@/lib/auth/config";

/**
 * Clears a session cookie that no longer works (signed out everywhere, account
 * deleted, removed from the team) so the visitor is not bounced between the
 * sign-in page and the dashboard. A working session is left alone, so other
 * sites cannot sign people out by linking here.
 */
export async function GET(req: NextRequest) {
  try {
    await requireOrganization();
    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch {
    return signOut({ redirectTo: "/login" });
  }
}
