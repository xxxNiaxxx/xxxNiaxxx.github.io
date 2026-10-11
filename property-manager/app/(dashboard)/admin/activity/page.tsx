import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActivityAdmin } from "@/components/admin/activity-admin";
import { PageHeader } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { isPlatformAdmin } from "@/lib/email";
import { getActivity } from "@/lib/services/activity";

export const metadata: Metadata = { title: "Χρήστες live" };
export const dynamic = "force-dynamic";

export default async function ActivityAdminPage() {
  const { user } = await getPageContext({ withoutSubscription: true });
  if (!isPlatformAdmin(user.email)) notFound();
  const activity = await getActivity();
  return (
    <>
      <PageHeader title="Χρήστες live" description="Ποιοι χρησιμοποιούν την εφαρμογή τώρα και τις τελευταίες ημέρες · ανανεώνεται μόνο του κάθε 30 δευτερόλεπτα" />
      <ActivityAdmin data={activity} />
    </>
  );
}
