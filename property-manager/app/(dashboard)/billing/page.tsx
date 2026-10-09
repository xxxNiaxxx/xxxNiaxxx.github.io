import type { Metadata } from "next";
import { BillingPanel } from "@/components/settings/billing";
import { PageHeader } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { billingState } from "@/lib/services/billing";

export const metadata: Metadata = { title: "Συνδρομή" };

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const { ctx } = await getPageContext({ withoutSubscription: true });
  const { done } = await searchParams;
  return (
    <>
      <PageHeader title="Συνδρομή" description="Τιμή ανά κατάλυμα, χωρίς δέσμευση. Ακυρώνετε όποτε θέλετε." />
      <BillingPanel state={await billingState(ctx)} justSubscribed={done === "1"} />
    </>
  );
}
