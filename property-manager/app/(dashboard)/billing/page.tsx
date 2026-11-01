import type { Metadata } from "next";
import { BillingPanel } from "@/components/settings/billing";
import { PageHeader } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { ReferralCard } from "@/components/settings/referral";
import { appOrigin } from "@/lib/request";
import { billingState } from "@/lib/services/billing";
import { referralState } from "@/lib/services/referrals";

export const metadata: Metadata = { title: "Συνδρομή" };

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const { ctx } = await getPageContext({ withoutSubscription: true });
  const { done } = await searchParams;
  return (
    <>
      <PageHeader title="Συνδρομή" description="Τιμή ανά κατάλυμα, χωρίς δέσμευση. Ακυρώνετε όποτε θέλετε." />
      <div className="grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-6">
        <BillingPanel state={await billingState(ctx)} justSubscribed={done === "1"} />
        <ReferralCard state={await referralState(ctx, await appOrigin())} />
      </div>
    </>
  );
}
