import { DEMO_EMAIL_DOMAIN } from "@/lib/demo-domain";
import { AppError } from "@/lib/errors";

export { DEMO_EMAIL_DOMAIN };

/** One of the shared demo users (demo@…, eleni@…, nikos@demo-hospitality.test). */
export const isDemoEmail = (email: string | null | undefined) => !!email && email.toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`);

/**
 * Everyone shares the demo account, so nobody may lock the others out or use
 * it to reach real people: no password change, sign-out everywhere, account
 * deletion, invitations or payments.
 */
export function assertNotDemo(email: string | null | undefined) {
  if (isDemoEmail(email)) throw new AppError("FORBIDDEN", "Δεν γίνεται στον λογαριασμό επίδειξης. Δημιουργήστε δικό σας λογαριασμό για να το δοκιμάσετε.");
}
