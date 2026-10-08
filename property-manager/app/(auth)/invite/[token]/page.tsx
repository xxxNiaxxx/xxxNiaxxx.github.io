import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { humanize } from "@/lib/format";
import { getInvitationByToken } from "@/lib/services/invitations";
import { switchAccountAction } from "../../actions";
import { AcceptInvitation } from "./accept-button";

export const metadata: Metadata = { title: "Πρόσκληση στην ομάδα" };

const UNAVAILABLE: Record<string, string> = {
  EXPIRED: "Η πρόσκληση έχει λήξει. Ζητήστε από όποιον σας προσκάλεσε να στείλει νέο σύνδεσμο.",
  ACCEPTED: "Η πρόσκληση έχει ήδη χρησιμοποιηθεί.",
  REVOKED: "Η πρόσκληση ακυρώθηκε. Ζητήστε νέο σύνδεσμο.",
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await getInvitationByToken(token);
  const session = await auth();
  const user = session?.user?.id ? await db.user.findUnique({ where: { id: session.user.id }, select: { email: true } }) : null;
  const path = `/invite/${token}`;

  if (!invitation || invitation.status !== "VALID") {
    return (
      <>
        <h1 className="text-2xl font-semibold tracking-tight">Η πρόσκληση δεν ισχύει</h1>
        <p className="mt-2 text-sm text-muted-foreground">{invitation ? UNAVAILABLE[invitation.status] : "Ο σύνδεσμος δεν είναι σωστός. Ελέγξτε ότι τον αντιγράψατε ολόκληρο."}</p>
        <Button asChild variant="outline" className="mt-6"><Link href={user ? "/dashboard" : "/login"}>{user ? "Στην εφαρμογή" : "Σύνδεση"}</Link></Button>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Πρόσκληση στην ομάδα</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {invitation.invitedByName ? <><b className="text-foreground">{invitation.invitedByName}</b> σας προσκαλεί</> : "Σας προσκαλούν"} στην ομάδα{" "}
        <b className="text-foreground">{invitation.organizationName}</b> ως <b className="text-foreground">{humanize(invitation.role)}</b>.
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">Η πρόσκληση είναι για το {invitation.email}.</p>

      {!user ? (
        <div className="mt-6 grid gap-2">
          <Button asChild size="lg"><Link href={`/register?invite=${encodeURIComponent(token)}`}>Δημιουργία λογαριασμού</Link></Button>
          <Button asChild size="lg" variant="outline"><Link href={`/login?next=${encodeURIComponent(path)}`}>Έχω ήδη λογαριασμό — Σύνδεση</Link></Button>
        </div>
      ) : user.email.toLowerCase() === invitation.email ? (
        <AcceptInvitation token={token} organizationName={invitation.organizationName} />
      ) : (
        <div className="mt-6 grid gap-3">
          <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm">
            Είστε συνδεδεμένοι ως <b>{user.email}</b>. Συνδεθείτε με το {invitation.email} για να αποδεχτείτε.
          </p>
          <form action={switchAccountAction}>
            <input type="hidden" name="next" value={path} />
            <Button type="submit" variant="outline" className="w-full">Σύνδεση με άλλο λογαριασμό</Button>
          </form>
        </div>
      )}
    </>
  );
}
