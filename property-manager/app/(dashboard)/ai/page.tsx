import type { Metadata } from "next";
import Link from "next/link";
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

export const metadata: Metadata = { title: "AI Assistant" };

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
      <PageHeader title="AI Assistant" description="Ask about your operations. Actions always wait for your approval." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <Chat key={current?.id ?? "new"} initial={current} mode={mode} />
        <aside className="grid min-w-0 content-start gap-6">
          {otherPending.length > 0 && (
            <Card>
              <CardHeader title="Pending approvals" description="Proposed in other chats" />
              <CardContent className="grid gap-3">
                {otherPending.map((a) => (
                  <ActionCard key={a.id} action={a} />
                ))}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader title="Recent chats" />
            <CardContent className="-mx-2 grid gap-0.5">
              {conversations.length === 0 && <p className="px-2 text-sm text-muted-foreground">No conversations yet.</p>}
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
