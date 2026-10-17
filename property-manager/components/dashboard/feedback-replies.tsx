"use client";

import { MessageSquareText, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import type { FeedbackReplyDTO } from "@/lib/services/feedback";
import type { TeamMessageDTO } from "@/lib/services/team-messages";

/** The team's text quoted in the user's answer, so the team sees what it answers. */
export const replyMessage = (r: { reply: string }, text: string) => `${text.trim()}\n\n— Απάντηση στο μήνυμα της ομάδας: «${r.reply.slice(0, 300)}»`;

type Item = { id: string; heading: string; quote: string | null; reply: string; seenUrl: string };

/**
 * The team's answers to the user's comments and messages from the team, on
 * the home page until the user closes them; the user can write back.
 */
export function FeedbackReplies({ items, messages = [] }: { items: FeedbackReplyDTO[]; messages?: TeamMessageDTO[] }) {
  const all: Item[] = [
    ...messages.map((m) => ({ id: m.id, heading: "Μήνυμα από την ομάδα του Βραχυχρόνια.ai", quote: null, reply: m.body, seenUrl: `/api/team-messages/${m.id}/seen` })),
    ...items.map((r) => ({ id: r.id, heading: "Η ομάδα του Βραχυχρόνια.ai απάντησε στο σχόλιό σας", quote: r.message, reply: r.reply, seenUrl: `/api/feedback/${r.id}/seen` })),
  ];
  const { run, pending } = useMutation();
  const [closed, setClosed] = useState<string[]>([]);
  const [writing, setWriting] = useState<string | null>(null);
  const [text, setText] = useState("");
  const shown = all.filter((r) => !closed.includes(r.id));
  if (!shown.length) return null;
  const close = (r: Item) => run(() => api(r.seenUrl, { method: "POST" }), { onSuccess: () => setClosed((c) => [...c, r.id]) });
  return (
    <div className="mb-6 grid gap-3">
      {shown.map((r) => (
        <Card key={r.id} className="border-accent/40">
          <CardContent className="grid gap-2 py-4 text-sm">
            <p className="flex items-center gap-2 font-semibold"><MessageSquareText className="size-4 text-accent" /> {r.heading}</p>
            {r.quote && <p className="line-clamp-2 text-muted-foreground">«{r.quote}»</p>}
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
                      void api(r.seenUrl, { method: "POST" }).catch(() => {});
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
                <Button size="sm" variant="outline" loading={pending} onClick={() => close(r)}>Εντάξει</Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
