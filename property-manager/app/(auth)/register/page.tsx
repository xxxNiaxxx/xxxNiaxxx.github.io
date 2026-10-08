import type { Metadata } from "next";
import Link from "next/link";
import { humanize } from "@/lib/format";
import { getInvitationByToken } from "@/lib/services/invitations";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Δημιουργία λογαριασμού" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { invite } = await searchParams;
  const invitation = invite ? await getInvitationByToken(invite) : null;
  const joining = invitation?.status === "VALID" ? { token: invite!, ...invitation } : null;
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Δημιουργήστε λογαριασμό</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {joining
          ? <>Μπαίνετε στην ομάδα <b className="text-foreground">{joining.organizationName}</b> ως {humanize(joining.role)}.</>
          : "Ρυθμίστε τον οργανισμό σας σε λιγότερο από ένα λεπτό."}
      </p>
      <RegisterForm invite={joining ? { token: joining.token, email: joining.email } : undefined} />
      <p className="mt-6 text-sm text-muted-foreground">
        Έχετε ήδη λογαριασμό;{" "}
        <Link href={joining ? `/login?next=${encodeURIComponent(`/invite/${joining.token}`)}` : "/login"} className="font-medium text-foreground underline-offset-4 hover:underline">
          Σύνδεση
        </Link>
      </p>
    </>
  );
}
