import Link from "next/link";

/** Shown in the shared demo organization. */
export function DemoBanner() {
  return (
    <div className="mb-6 flex flex-col gap-2 rounded-xl border border-accent/30 bg-accent-soft p-4 text-sm sm:flex-row sm:items-center sm:gap-4">
      <p className="min-w-0 flex-1">
        <strong>Λογαριασμός επίδειξης.</strong> Δοκιμάστε ελεύθερα: τα δεδομένα επαναφέρονται κάθε βράδυ και τα βλέπουν και
        άλλοι επισκέπτες, γι’ αυτό μη βάζετε πραγματικά στοιχεία.
      </p>
      <Link href="/waitlist" className="shrink-0 font-medium text-accent underline-offset-4 hover:underline">Θέλω δικό μου λογαριασμό →</Link>
    </div>
  );
}
