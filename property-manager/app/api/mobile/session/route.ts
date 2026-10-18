import { z } from "zod";
import { readJson, route } from "@/lib/api";
import { requireOrganization } from "@/lib/auth";
import { resolveMembership } from "@/lib/auth/membership";
import { SecondStepError, signMobileToken, verifyCredentials } from "@/lib/auth/token";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { TERMS_VERSION } from "@/lib/legal";

/** Teams the user belongs to, for the organization switcher. */
const organizationsOf = (userId: string) =>
  db.organizationMember
    .findMany({ where: { userId }, include: { organization: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } })
    .then((rows) => rows.map((m) => ({ ...m.organization, role: m.role })));

const body = z.object({ email: z.string().trim().min(1), password: z.string().min(1), code: z.string().trim().max(20).optional() });

/**
 * Mobile sign-in: exchanges email + password (and, with two-step sign-in on,
 * the code) for a 30-day bearer token. A missing/wrong code answers 401 with
 * details.secondStep = "totp" / "totp-invalid".
 */
export const POST = route(async (req) => {
  const { email, password, code } = body.parse(await readJson(req));
  let user;
  try {
    user = await verifyCredentials(email, password, { code, client: "app" });
  } catch (e) {
    if (!(e instanceof SecondStepError)) throw e;
    const message = e.step === "totp" ? "Γράψτε τον κωδικό 2 βημάτων από την εφαρμογή επαλήθευσης." : "Ο κωδικός 2 βημάτων δεν είναι σωστός.";
    throw new AppError("UNAUTHORIZED", message, { secondStep: e.step });
  }
  if (!user) throw new AppError("UNAUTHORIZED", "Λάθος email ή κωδικός.");
  const membership = await resolveMembership(user.id);
  if (!membership) throw new AppError("FORBIDDEN", "Δεν είστε μέλος κάποιου οργανισμού");
  return {
    token: await signMobileToken(user.id, user.sessionVersion),
    user: { id: user.id, name: user.name, email: user.email },
    organization: membership.organization,
    role: membership.role,
    organizations: await organizationsOf(user.id),
    termsAccepted: (await db.user.findUnique({ where: { id: user.id }, select: { termsVersion: true } }))?.termsVersion === TERMS_VERSION,
  };
});

/** Current mobile session (validates the bearer token). */
export const GET = route(async () => {
  const { user, organization, membership } = await requireOrganization();
  return {
    user: { id: user.id, name: user.name, email: user.email },
    organization,
    role: membership.role,
    organizations: await organizationsOf(user.id),
    termsAccepted: user.termsVersion === TERMS_VERSION,
  };
});
