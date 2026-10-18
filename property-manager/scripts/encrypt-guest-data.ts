/**
 * Run on every deploy (vercel-build), after the migrations: encrypts guest
 * data still stored in the clear and fills in the email/phone hashes, so the
 * new version finds guests by email from its first request. Safe to re-run.
 * A failure does not stop the deploy: the daily job does the same work.
 */
import { db } from "@/lib/db";
import { reencryptGuestData } from "@/lib/services/data-protection";

reencryptGuestData()
  .then((r) => console.log(`Guest data encrypted: ${r.guests} guests, ${r.reservations} reservations`))
  .catch((e) => console.warn("Guest data encryption skipped (the daily job will retry):", e instanceof Error ? e.message : e))
  .finally(() => db.$disconnect());
