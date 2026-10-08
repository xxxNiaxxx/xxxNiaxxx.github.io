import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson, route } from "@/lib/api";
import { ACTIVE_ORG_COOKIE, requireUser, resolveMembership } from "@/lib/auth";
import { AppError } from "@/lib/errors";

/** Switch the active organization — only to one the user belongs to. */
export const POST = route(async (req) => {
  const user = await requireUser();
  const { organizationId } = z.object({ organizationId: z.string().min(1) }).parse(await readJson(req));
  const membership = await resolveMembership(user.id, organizationId);
  if (!membership || membership.organizationId !== organizationId) {
    throw new AppError("NOT_FOUND", "Organization not found");
  }
  const res = NextResponse.json({ data: { organizationId } });
  res.cookies.set(ACTIVE_ORG_COOKIE, organizationId, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });
  return res;
});
