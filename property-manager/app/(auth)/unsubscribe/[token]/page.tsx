import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { unsubscribe, verifyUnsubscribeToken } from "@/lib/services/welcome-emails";

export const metadata: Metadata = { title: "Διαγραφή από τα email" };

/**
 * Unsubscribe from tips and news emails. A button (POST), not the link itself,
 * so mail scanners that open links do not unsubscribe anyone.
 */
export default async function UnsubscribePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string }> }) {
  const { token } = await params;
  const { done } = await searchParams;
  const valid = !!verifyUnsubscribeToken(token);

  async function confirm() {
    "use server";
    await unsubscribe(token);
    redirect(`/unsubscribe/${token}?done=1`);
  }

  if (!valid) {
    return (
      <>
        <h1 className="text-2xl font-semibold tracking-tight">Ο σύνδεσμος δεν ισχύει</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ελέγξτε ότι τον αντιγράψατε ολόκληρο, ή απαντήστε στο email που λάβατε και θα σας διαγράψουμε εμείς.</p>
      </>
    );
  }
  if (done) {
    return (
      <>
        <h1 className="text-2xl font-semibold tracking-tight">Έγινε ✓</h1>
        <p className="mt-2 text-sm text-muted-foreground">Δεν θα λαμβάνετε πια email με συμβουλές και νέα. Οι υπενθυμίσεις και οι αναφορές της εφαρμογής ρυθμίζονται χωριστά από τις Ρυθμίσεις.</p>
      </>
    );
  }
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Διαγραφή από τα email</h1>
      <p className="mt-2 text-sm text-muted-foreground">Να σταματήσουν τα email με συμβουλές και νέα του Βραχυχρόνια.ai;</p>
      <form action={confirm} className="mt-6">
        <Button type="submit" size="lg">Ναι, διαγραφή</Button>
      </form>
    </>
  );
}
