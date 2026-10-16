"use client";

import { MessageSquareText } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import type { FeedbackReplyDTO } from "@/lib/services/feedback";

/** Answers from the team to the user's comments, until they close them. */
export function FeedbackReplies({ items }: { items: FeedbackReplyDTO[] }) {
  const { run, pending } = useMutation();
  const [closed, setClosed] = useState<string[]>([]);
  const shown = items.filter((r) => !closed.includes(r.id));
  if (!shown.length) return null;
  return (
    <div className="mb-6 grid gap-3">
      {shown.map((r) => (
        <Card key={r.id} className="border-accent/40">
          <CardContent className="grid gap-2 py-4 text-sm">
            <p className="flex items-center gap-2 font-semibold"><MessageSquareText className="size-4 text-accent" /> Η ομάδα του Βραχυχρόνια.ai απάντησε στο σχόλιό σας</p>
            <p className="line-clamp-2 text-muted-foreground">«{r.message}»</p>
            <p className="whitespace-pre-line">{r.reply}</p>
            <div>
              <Button size="sm" variant="outline" loading={pending} onClick={() => run(() => api(`/api/feedback/${r.id}/seen`, { method: "POST" }), { onSuccess: () => setClosed((c) => [...c, r.id]) })}>Εντάξει</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
