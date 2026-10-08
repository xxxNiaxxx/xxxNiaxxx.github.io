"use client";

import { ArrowUp, MessageSquarePlus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { AIActionDTO } from "@/lib/ai/actions";
import type { ConversationDTO } from "@/lib/ai/chat";
import { api, ApiError } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import { ActionCard } from "./action-card";
import { RichText } from "./rich-text";

type Msg = ConversationDTO["messages"][number];

const SUGGESTIONS = [
  "Τι χρειάζεται την προσοχή μου σήμερα;",
  "Ποιος έρχεται αύριο;",
  "Πόσα έβγαλα αυτόν τον μήνα;",
  "Ποιο ακίνητο αποδίδει καλύτερα;",
  "Τι πρέπει να δηλώσω στην ΑΑΔΕ;",
];

interface ChatResponse {
  conversationId: string;
  mode: "llm" | "offline";
  message: Msg;
  toolsUsed: string[];
  actions: AIActionDTO[];
}

export function Chat({ initial, mode }: { initial: ConversationDTO | null; mode: "llm" | "offline" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [conversationId, setConversationId] = useState(initial?.id ?? null);
  const [messages, setMessages] = useState<Msg[]>(initial?.messages ?? []);
  const [actions, setActions] = useState<AIActionDTO[]>(initial?.actions ?? []);
  const [tools, setTools] = useState<Record<string, string[]>>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const autoSent = useRef(false);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [messages.length, actions.length, sending]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    setInput("");
    setSending(true);
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "user", content, createdAt: new Date().toISOString() }]);
    try {
      const res = await api<ChatResponse>("/api/ai/chat", { body: { conversationId, message: content } });
      setMessages((m) => [...m, res.message]);
      setActions(res.actions);
      setTools((t) => ({ ...t, [res.message.id]: res.toolsUsed }));
      if (!conversationId) {
        setConversationId(res.conversationId);
        router.replace(`/ai?c=${res.conversationId}`, { scroll: false });
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Ο βοηθός δεν είναι διαθέσιμος αυτή τη στιγμή.");
      setMessages((m) => m.slice(0, -1));
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    const q = params.get("q");
    if (q && !autoSent.current) {
      autoSent.current = true;
      void send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actions are shown after the assistant message of the turn that proposed them.
  const actionsAfter = (index: number) => {
    const msg = messages[index];
    const nextMsg = messages[index + 1];
    if (msg.role !== "assistant") return [];
    return actions
      .filter((a) => a.createdAt <= msg.createdAt && (!messages[index - 1] || a.createdAt >= messages[index - 1].createdAt) && (!nextMsg || a.createdAt < nextMsg.createdAt))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  };
  const placed = new Set(messages.flatMap((_, i) => actionsAfter(i).map((a) => a.id)));
  const orphanActions = actions.filter((a) => !placed.has(a.id));

  return (
    <div className="flex h-[calc(100dvh-13rem)] min-h-[28rem] flex-col rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)] lg:h-[calc(100dvh-11rem)]">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-accent" /> Βοηθός AI
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", mode === "llm" ? "bg-success-soft text-success" : "bg-muted text-muted-foreground")}>
            {mode === "llm" ? "Συνδεδεμένος" : "Εκτός σύνδεσης"}
          </span>
        </div>
        <Link href="/ai" className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
          <MessageSquarePlus className="size-4" /> Νέα συνομιλία
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
        {messages.length === 0 && !sending ? (
          <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-2xl bg-accent-soft p-3 text-accent"><Sparkles className="size-6" /></div>
            <h2 className="text-lg font-semibold tracking-tight">Πώς μπορώ να βοηθήσω;</h2>
            <p className="mt-1 text-sm text-muted-foreground">Απαντώ από τις κρατήσεις, τις εργασίες και τα οικονομικά σας — και ρωτάω πάντα πριν στείλω οτιδήποτε.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:border-border-strong hover:text-foreground">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto grid max-w-3xl gap-5">
            {messages.map((m, i) => (
              <div key={m.id} className="grid gap-3">
                <div className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      m.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted/70",
                    )}
                  >
                    <RichText text={m.content} />
                    {tools[m.id]?.length ? (
                      <div className="mt-2 border-t border-border/70 pt-1.5 text-[11px] text-muted-foreground">
                        Εργαλεία: {[...new Set(tools[m.id])].join(", ")}
                      </div>
                    ) : null}
                  </div>
                </div>
                {actionsAfter(i).map((a) => (
                  <div key={a.id} className="max-w-[85%]">
                    <ActionCard action={a} onChange={(u) => setActions((xs) => xs.map((x) => (x.id === u.id ? u : x)))} />
                  </div>
                ))}
              </div>
            ))}
            {orphanActions.map((a) => (
              <div key={a.id} className="max-w-[85%]">
                <ActionCard action={a} onChange={(u) => setActions((xs) => xs.map((x) => (x.id === u.id ? u : x)))} />
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-muted/70 px-4 py-3 text-muted-foreground" style={{ width: "fit-content" }} aria-label="Ο βοηθός σκέφτεται">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="size-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: `${i * 120}ms` }} />
                ))}
              </div>
            )}
            <div ref={bottom} />
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="border-t border-border p-3 sm:p-4"
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/15">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            placeholder="Ρωτήστε τον βοηθό AI…"
            aria-label="Μήνυμα"
            className="max-h-40 min-h-6 flex-1 resize-none bg-transparent py-1 text-sm outline-none placeholder:text-subtle-foreground"
          />
          <button type="submit" disabled={!input.trim() || sending} className="rounded-lg bg-primary p-1.5 text-primary-foreground disabled:opacity-30" aria-label="Αποστολή">
            <ArrowUp className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
