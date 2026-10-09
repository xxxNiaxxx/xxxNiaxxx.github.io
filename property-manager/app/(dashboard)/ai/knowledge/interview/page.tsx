import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { KnowledgeInterview } from "@/components/ai/interview";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { interviewState } from "@/lib/ai/interview";
import { getPageContext } from "@/lib/auth/page";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Ερωτήσεις του βοηθού" };

export default async function InterviewPage({ searchParams }: { searchParams: Promise<{ property?: string }> }) {
  const { ctx } = await getPageContext();
  const { property } = await searchParams;
  const properties = await db.property.findMany({ where: { organizationId: ctx.organizationId, status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const header = (
    <PageHeader
      back={{ href: "/ai/knowledge", label: "Γνώσεις AI" }}
      title="Ο βοηθός σάς ρωτά"
      description="Απαντήστε σε λίγες ερωτήσεις για κάθε κατάλυμα, ή αφήστε τον να τις βρει στη σελίδα σας στο Booking.com / Airbnb. Οι απαντήσεις χρησιμοποιούνται στα μηνύματα προς τους επισκέπτες και στον οδηγό επισκέπτη."
    />
  );
  if (!properties.length) {
    return (
      <>
        {header}
        <EmptyState icon={<Building2 />} title="Προσθέστε πρώτα ένα ακίνητο" action={<Button asChild><Link href="/properties">Ακίνητα</Link></Button>} />
      </>
    );
  }
  const selected = properties.find((p) => p.id === property) ?? properties[0];
  const state = await interviewState(ctx, selected.id);
  return (
    <>
      {header}
      <KnowledgeInterview key={selected.id} state={state} properties={properties} />
    </>
  );
}
