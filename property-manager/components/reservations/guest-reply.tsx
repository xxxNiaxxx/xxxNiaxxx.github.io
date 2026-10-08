"use client";

import { Check, Copy, ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { api, ApiError } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";

interface Draft { reply: string; offline: boolean; usedInfo: number; conversationUrl: string | null }

/**
 * Reply to a guest's message from Airbnb/Booking/email: paste it, the
 * assistant drafts an answer from what it knows about the property, copy
 * it into the platform.
 */
export function GuestReply({ reservationId, guestId }: { reservationId: string; guestId: string }) {
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const save = useMutation();

  async function generate() {
    setBusy(true);
    try {
      const d = await api<Draft>("/api/ai/reply", { body: { reservationId, guestMessage: message } });
      setDraft(d);
      setReply(d.reply);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Δεν ετοιμάστηκε απάντηση. Δοκιμάστε ξανά.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(reply);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Η αντιγραφή απέτυχε — επιλέξτε το κείμενο και αντιγράψτε το.");
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2 rounded-xl border border-border bg-muted/30 p-3">
      <div className="text-[13px] font-medium">Απάντηση σε μήνυμα του επισκέπτη</div>
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder="Επικολλήστε εδώ το μήνυμα του επισκέπτη από το Airbnb, το Booking ή το email…"
        aria-label="Μήνυμα του επισκέπτη"
      />
      <div>
        <Button size="sm" disabled={message.trim().length < 2} loading={busy} onClick={generate}>
          <Sparkles /> Γράψε απάντηση
        </Button>
      </div>

      {draft && (
        <div className="grid gap-2 border-t border-border pt-3">
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={8} aria-label="Πρόχειρη απάντηση" />
          <p className="text-xs text-muted-foreground">
            {draft.offline
              ? draft.usedInfo
                ? "Γράφτηκε από τις σημειώσεις του καταλύματος (χωρίς μοντέλο AI). Ελέγξτε την πριν τη στείλετε."
                : "Δεν βρέθηκε σημείωση για αυτό το θέμα — η απάντηση λέει ότι θα το ελέγξετε."
              : "Γράφτηκε από τον βοηθό AI με όσα ξέρει για το κατάλυμα. Ελέγξτε την πριν τη στείλετε."}{" "}
            Πείτε στον βοηθό τα στοιχεία του καταλύματος (Wi-Fi, πάρκινγκ, check-in…) στις{" "}
            <Link href="/ai/knowledge" className="underline underline-offset-4">Γνώσεις</Link>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={copy}>{copied ? <Check /> : <Copy />} {copied ? "Αντιγράφηκε" : "Αντιγραφή"}</Button>
            {draft.conversationUrl && (
              <Button size="sm" variant="outline" asChild>
                <a href={draft.conversationUrl} target="_blank" rel="noreferrer"><ExternalLink /> Άνοιγμα συνομιλίας</a>
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              loading={save.pending}
              onClick={() =>
                save.run(() => api("/api/messages", { body: { guestId, reservationId, content: reply, send: true } }), {
                  success: "Καταγράφηκε στο ιστορικό",
                  onSuccess: () => {
                    setDraft(null);
                    setMessage("");
                    setReply("");
                  },
                })
              }
            >
              Καταγραφή ως σταλμένο
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
