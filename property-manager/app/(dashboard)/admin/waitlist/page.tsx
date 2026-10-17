import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WaitlistAdmin } from "@/components/admin/waitlist-admin";
import { PushNotifications } from "@/components/settings/push-notifications";
import { PageHeader } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { emailConfigured, isPlatformAdmin } from "@/lib/email";
import { isAutoApprove, isRegistrationOpen, listWaitlist } from "@/lib/services/waitlist";

export const metadata: Metadata = { title: "Λίστα αναμονής" };

export default async function WaitlistAdminPage() {
  const { user } = await getPageContext();
  if (!isPlatformAdmin(user.email)) notFound();
  const [entries, registrationOpen, autoApprove] = await Promise.all([listWaitlist(), isRegistrationOpen(), isAutoApprove()]);
  return (
    <>
      <PageHeader title="Λίστα αναμονής" description="Ποιοι ζήτησαν να δοκιμάσουν την εφαρμογή και ποιοι έχουν πρόσβαση" />
      <div className="mb-6 max-w-3xl">
        <PushNotifications description="Σας ειδοποιεί αμέσως για νέες αιτήσεις στη λίστα αναμονής και νέα σχόλια χρηστών. Ενεργοποιήστε το σε κάθε κινητό ή υπολογιστή που θέλετε." />
      </div>
      <WaitlistAdmin
        entries={entries}
        registrationOpen={registrationOpen}
        autoApprove={autoApprove}
        emailReady={emailConfigured()}
        playTestingUrl={process.env.PLAY_TESTING_URL || null}
      />
    </>
  );
}
