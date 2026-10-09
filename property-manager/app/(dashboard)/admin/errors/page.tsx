import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ErrorsAdmin } from "@/components/admin/errors-admin";
import { PageHeader } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { isPlatformAdmin } from "@/lib/email";
import { listErrors } from "@/lib/monitoring/errors";

export const metadata: Metadata = { title: "Σφάλματα" };

export default async function ErrorsAdminPage() {
  const { user } = await getPageContext();
  if (!isPlatformAdmin(user.email)) notFound();
  return (
    <>
      <PageHeader
        title="Σφάλματα"
        description="Απρόβλεπτα σφάλματα του διακομιστή, ομαδοποιημένα. Σας στέλνουμε email την πρώτη φορά, αν ξαναεμφανιστεί κάτι που σημειώσατε ως λυμένο, και το πολύ κάθε 6 ώρες όσο συνεχίζεται."
      />
      <ErrorsAdmin items={await listErrors()} />
    </>
  );
}
