import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WaitlistAdmin } from "@/components/admin/waitlist-admin";
import { PageHeader } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { emailConfigured, isPlatformAdmin } from "@/lib/email";
import { isRegistrationOpen, listWaitlist } from "@/lib/services/waitlist";

export const metadata: Metadata = { title: "Λίστα αναμονής" };

export default async function WaitlistAdminPage() {
  const { user } = await getPageContext();
  if (!isPlatformAdmin(user.email)) notFound();
  const [entries, registrationOpen] = await Promise.all([listWaitlist(), isRegistrationOpen()]);
  return (
    <>
      <PageHeader title="Λίστα αναμονής" description="Ποιοι ζήτησαν να δοκιμάσουν την εφαρμογή και ποιοι έχουν πρόσβαση" />
      <WaitlistAdmin
        entries={entries}
        registrationOpen={registrationOpen}
        emailReady={emailConfigured()}
        playTestingUrl={process.env.PLAY_TESTING_URL || null}
      />
    </>
  );
}
