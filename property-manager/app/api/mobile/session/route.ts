import { z } from "zod";
import { readJson, route } from "@/lib/api";
import { requireOrganization } from "@/lib/auth";
import { resolveMembership } from "@/lib/auth/membership";
import { signMobileToken, verifyCredentials } from "@/lib/auth/token";
import { AppError } from "@/lib/errors";

const body = z.object({ email: z.string().trim().min(1), password: z.string().min(1) });

/** Mobile sign-in: exchanges email + password for a 30-day bearer token. */
export const POST = route(async (req) => {
  const { email, password } = body.parse(await readJson(req));
  const user = await verifyCredentials(email, password);
  if (!user) throw new AppError("UNAUTHORIZED", "Incorrect email or password.");
  const membership = await resolveMembership(user.id);
  if (!membership) throw new AppError("FORBIDDEN", "You are not a member of any organization");
  return {
    token: await signMobileToken(user.id),
    user: { id: user.id, name: user.name, email: user.email },
    organization: membership.organization,
    role: membership.role,
  };
});

/** Current mobile session (validates the bearer token). */
export const GET = route(async () => {
  const { user, organization, membership } = await requireOrganization();
  return { user: { id: user.id, name: user.name, email: user.email }, organization, role: membership.role };
});
