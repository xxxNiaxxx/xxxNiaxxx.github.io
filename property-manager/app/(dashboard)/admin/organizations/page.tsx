import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrganizationsAdmin } from "@/components/admin/organizations-admin";
import { PageHeader } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { isPlatformAdmin } from "@/lib/email";
import { listOrganizationsForAdmin, PRICE_PER_PROPERTY } from "@/lib/services/billing";

export const metadata: Metadata = { title: "Οργανισμοί" };

export default async function OrganizationsAdminPage() {
  const { user } = await getPageContext({ withoutSubscription: true });
  if (!isPlatformAdmin(user.email)) notFound();
  const orgs = await listOrganizationsForAdmin();
  const paying = orgs.filter((o) => !o.billingExempt && (o.status === "active" || o.status === "past_due"));
  const mrr = paying.reduce((a, o) => a + (o.quantity ?? 0) * PRICE_PER_PROPERTY, 0);
  return (
    <>
      <PageHeader
        title="Οργανισμοί"
        description={`${orgs.length} λογαριασμοί · ${paying.length} πληρώνουν · ${mrr.toLocaleString("el-GR")} € τον μήνα. Με «Δωρεάν» ένας λογαριασμός δεν χρεώνεται ποτέ (π.χ. συνεργάτες, testers).`}
      />
      <OrganizationsAdmin items={orgs} />
    </>
  );
}
