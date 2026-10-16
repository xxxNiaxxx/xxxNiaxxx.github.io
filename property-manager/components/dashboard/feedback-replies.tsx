"use client";

import { MessageSquareText, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import type { FeedbackReplyDTO } from "@/lib/services/feedback";

/** The team's answer quoted in the user's reply, so the team sees what it answers. */
export const replyMessage = (r: { reply: string }, text: string) => `${text.trim()}\n\n— Απάντηση στο μήνυμα της ομάδας: «${r.reply.slice(0, 300)}»`;

/** Answers from the team to the user's comments, until they close them; the user can write back. */
export function FeedbackReplies({ items }: { items: FeedbackReplyDTO[] }) {
  const { run, pending } = useMutation();
  const [closed, setClosed] = useState<string[]>([]);
  const [writing, setWriting] = useState<string | null>(null);
  const [text, setText] = useState("");
  const shown = items.filter((r) => !closed.includes(r.id));
  if (!shown.length) return null;
  const close = (id: string) => run(() => api(`/api/feedback/${id}/seen`, { method: "POST" }), { onSuccess: () => setClosed((c) => [...c, id]) });
  return (
    <div className="mb-6 grid gap-3">
      {shown.map((r) => (
        <Card key={r.id} className="border-accent/40">
          <CardContent className="grid gap-2 py-4 text-sm">
            <p className="flex items-center gap-2 font-semibold"><MessageSquareText className="size-4 text-accent" /> Η ομάδα του Βραχυχρόνια.ai απάντησε στο σχόλιό σας</p>
            <p className="line-clamp-2 text-muted-foreground">«{r.message}»</p>
            <p className="whitespace-pre-line">{r.reply}</p>
            {writing === r.id ? (
              <form
                className="grid gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(() => api("/api/feedback", { body: { kind: "OTHER", message: replyMessage(r, text), page: "/dashboard", client: "web" } }), {
                    success: "Ευχαριστούμε! Το λάβαμε.",
                    refresh: false,
                    onSuccess: () => {
                      setClosed((c) => [...c, r.id]);
                      setWriting(null);
                      setText("");
                      void api(`/api/feedback/${r.id}/seen`, { method: "POST" }).catch(() => {});
                    },
                  });
                }}
              >
                <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} aria-label="Η απάντησή σας" placeholder="Γράψτε μας, ακόμα και με μια φράση…" autoFocus />
                <div className="flex gap-2">
                  <Button size="sm" type="submit" loading={pending} disabled={text.trim().length < 3}><Send /> Αποστολή</Button>
                  <Button size="sm" type="button" variant="ghost" onClick={() => setWriting(null)}>Ακύρωση</Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => { setWriting(r.id); setText(""); }}>Απάντηση</Button>
                <Button size="sm" variant="outline" loading={pending} onClick={() => close(r.id)}>Εντάξει</Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
