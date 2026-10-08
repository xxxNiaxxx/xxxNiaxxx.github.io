import type { Metadata } from "next";
import { Brain } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ActionCard } from "@/components/ai/action-card";
import { Chat } from "@/components/ai/chat";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { listActions } from "@/lib/ai/actions";
import { getConversation, listConversations } from "@/lib/ai/chat";
import { getPageContext } from "@/lib/auth/page";
import { AppError } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Βοηθός AI" };

export default async function AIPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { ctx } = await getPageContext();
  const { c } = await searchParams;
  const [conversations, pending, current] = await Promise.all([
    listConversations(ctx),
    listActions(ctx, { status: "PROPOSED" }),
    c ? getConversation(ctx, c).catch((e) => (e instanceof AppError ? null : Promise.reject(e))) : Promise.resolve(null),
  ]);
  const otherPending = pending.filter((a) => a.conversationId !== current?.id);
  const mode = process.env.AI_API_KEY ? "llm" : "offline";

  return (
    <>
      <PageHeader
        title="Βοηθός AI"
        description="Ρωτήστε για τη λειτουργία των καταλυμάτων σας. Κάθε ενέργεια περιμένει την έγκρισή σας."
        actions={<Button asChild variant="outline"><Link href="/ai/knowledge"><Brain /> Γνώσεις AI</Link></Button>}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Chat key={current?.id ?? "new"} initial={current} mode={mode} />
        <aside className="grid min-w-0 grid-cols-1 content-start gap-6">
          {otherPending.length > 0 && (
            <Card>
              <CardHeader title="Προς έγκριση" description="Προτάσεις από άλλες συνομιλίες" />
              <CardContent className="grid gap-3">
                {otherPending.map((a) => (
                  <ActionCard key={a.id} action={a} />
                ))}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader title="Πρόσφατες συνομιλίες" />
            <CardContent className="-mx-2 grid gap-0.5">
              {conversations.length === 0 && <p className="px-2 text-sm text-muted-foreground">Δεν υπάρχουν συνομιλίες ακόμη.</p>}
              {conversations.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/ai?c=${conv.id}`}
                  className={cn("rounded-lg px-2 py-2 hover:bg-muted", conv.id === current?.id && "bg-muted")}
                >
                  <div className="truncate text-sm font-medium">{conv.title}</div>
                  <div className="text-[11px] text-muted-foreground">{formatDateTime(conv.updatedAt)}</div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
