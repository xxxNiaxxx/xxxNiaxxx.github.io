import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FREE_UNTIL_NOTE } from "@/lib/brand";
import { humanize } from "@/lib/format";
import { getInvitationByToken } from "@/lib/services/invitations";
import { getWaitlistAccess, isRegistrationOpen } from "@/lib/services/waitlist";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Δημιουργία λογαριασμού" };

const ACCESS_MESSAGES = {
  EXPIRED: "Ο σύνδεσμος εγγραφής σας έχει λήξει. Απαντήστε στο email που λάβατε για να σας στείλουμε νέο.",
  USED: "Αυτός ο σύνδεσμος έχει ήδη χρησιμοποιηθεί. Συνδεθείτε με τον λογαριασμό σας.",
  INVALID: "Ο σύνδεσμος εγγραφής δεν είναι έγκυρος.",
} as const;

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ invite?: string; access?: string }> }) {
  const { invite, access } = await searchParams;
  const invitation = invite ? await getInvitationByToken(invite) : null;
  const joining = invitation?.status === "VALID" ? { token: invite!, ...invitation } : null;
  const approved = !joining && access ? await getWaitlistAccess(access) : null;
  const accessOk = approved?.status === "VALID";

  if (!joining && !accessOk && !(await isRegistrationOpen())) {
    if (!access) redirect("/waitlist");
    return (
      <>
        <h1 className="text-2xl font-semibold tracking-tight">Δημιουργία λογαριασμού</h1>
        <p className="mt-4 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning" role="alert">
          {ACCESS_MESSAGES[approved?.status === "EXPIRED" || approved?.status === "USED" ? approved.status : "INVALID"]}
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">Σύνδεση</Link>
          {" · "}
          <Link href="/waitlist" className="font-medium text-foreground underline-offset-4 hover:underline">Λίστα αναμονής</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Δημιουργήστε λογαριασμό</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {joining
          ? <>Μπαίνετε στην ομάδα <b className="text-foreground">{joining.organizationName}</b> ως {humanize(joining.role)}.</>
          : accessOk
            ? `Καλώς ήρθατε στη δοκιμή! ${FREE_UNTIL_NOTE}`
            : "Ρυθμίστε τον οργανισμό σας σε λιγότερο από ένα λεπτό."}
      </p>
      <RegisterForm
        invite={joining ? { token: joining.token, email: joining.email } : undefined}
        access={accessOk ? { token: access!, email: approved.email, name: approved.name } : undefined}
      />
      <p className="mt-6 text-sm text-muted-foreground">
        Έχετε ήδη λογαριασμό;{" "}
        <Link href={joining ? `/login?next=${encodeURIComponent(`/invite/${joining.token}`)}` : "/login"} className="font-medium text-foreground underline-offset-4 hover:underline">
          Σύνδεση
        </Link>
      </p>
    </>
  );
}
