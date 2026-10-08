import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson, route } from "@/lib/api";
import { ACTIVE_ORG_COOKIE, requireUser } from "@/lib/auth";
import { acceptInvitationForUser } from "@/lib/services/invitations";

/** { token } — joins the team and makes it the active organization. */
export const POST = route(async (req) => {
  const user = await requireUser();
  const { token } = z.object({ token: z.string().trim().min(1).max(200) }).parse(await readJson(req));
  const { organizationId } = await acceptInvitationForUser(user, token);
  const res = NextResponse.json({ data: { organizationId } });
  res.cookies.set(ACTIVE_ORG_COOKIE, organizationId, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });
  return res;
});
