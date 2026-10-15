import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessageTemplates } from "@/components/admin/message-templates";
import { PageHeader } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { isPlatformAdmin } from "@/lib/email";
import { MESSAGE_TEMPLATE_GROUPS } from "@/lib/message-templates";

export const metadata: Metadata = { title: "Πρότυπα μηνυμάτων" };

export default async function MessageTemplatesPage() {
  const { user } = await getPageContext({ withoutSubscription: true });
  if (!isPlatformAdmin(user.email)) notFound();
  return (
    <>
      <PageHeader
        title="Πρότυπα μηνυμάτων"
        description="Έτοιμα μηνύματα για τη λίστα αναμονής, τους νέους χρήστες και το Facebook. Πατήστε «Αντιγραφή» και επικολλήστε όπου θέλετε· αλλάξτε ό,τι είναι σε [αγκύλες]."
      />
      <MessageTemplates groups={MESSAGE_TEMPLATE_GROUPS} />
    </>
  );
}
