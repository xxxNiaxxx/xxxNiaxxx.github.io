import { z } from "zod";
import { readJson, route } from "@/lib/api";
import { requireOrganization } from "@/lib/auth";
import { resolveMembership } from "@/lib/auth/membership";
import { signMobileToken, verifyCredentials } from "@/lib/auth/token";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

/** Teams the user belongs to, for the organization switcher. */
const organizationsOf = (userId: string) =>
  db.organizationMember
    .findMany({ where: { userId }, include: { organization: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } })
    .then((rows) => rows.map((m) => ({ ...m.organization, role: m.role })));

const body = z.object({ email: z.string().trim().min(1), password: z.string().min(1) });

/** Mobile sign-in: exchanges email + password for a 30-day bearer token. */
export const POST = route(async (req) => {
  const { email, password } = body.parse(await readJson(req));
  const user = await verifyCredentials(email, password);
  if (!user) throw new AppError("UNAUTHORIZED", "Λάθος email ή κωδικός.");
  const membership = await resolveMembership(user.id);
  if (!membership) throw new AppError("FORBIDDEN", "Δεν είστε μέλος κάποιου οργανισμού");
  return {
    token: await signMobileToken(user.id),
    user: { id: user.id, name: user.name, email: user.email },
    organization: membership.organization,
    role: membership.role,
    organizations: await organizationsOf(user.id),
  };
});

/** Current mobile session (validates the bearer token). */
export const GET = route(async () => {
  const { user, organization, membership } = await requireOrganization();
  return { user: { id: user.id, name: user.name, email: user.email }, organization, role: membership.role, organizations: await organizationsOf(user.id) };
});
