import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeedbackAdmin } from "@/components/admin/feedback-admin";
import { PageHeader } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { isPlatformAdmin } from "@/lib/email";
import { listFeedback } from "@/lib/services/feedback";

export const metadata: Metadata = { title: "Σχόλια χρηστών" };

export default async function FeedbackAdminPage() {
  const { user } = await getPageContext();
  if (!isPlatformAdmin(user.email)) notFound();
  return (
    <>
      <PageHeader title="Σχόλια χρηστών" description="Προβλήματα, ιδέες και σχόλια από το «Στείλτε σχόλιο»" />
      <FeedbackAdmin items={await listFeedback()} />
    </>
  );
}
