"use client";

import { Languages, Send, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { api, ApiError } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";

/** Phase 1: messages are recorded on the INTERNAL channel (no real delivery). */
export function MessageComposer({
  guestId,
  reservationId,
  guestLanguageName,
  aiEnabled,
}: {
  guestId: string;
  reservationId?: string;
  /** e.g. "Γερμανικά" — shown on the translate button */
  guestLanguageName?: string;
  aiEnabled?: boolean;
}) {
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const { run, pending } = useMutation();
  const submit = (send: boolean) =>
    run(() => api("/api/messages", { body: { guestId, reservationId, content, send } }), {
      success: send ? "Το μήνυμα καταγράφηκε ως σταλμένο" : "Το πρόχειρο αποθηκεύτηκε",
      onSuccess: () => {
        setContent("");
        setOriginal(null);
      },
    });

  async function translate() {
    setTranslating(true);
    try {
      const res = await api<{ text: string; languageName: string }>("/api/ai/translate", { body: { text: content, guestId } });
      setOriginal(content);
      setContent(res.text);
      toast.success(`Μεταφράστηκε στα ${res.languageName.toLowerCase()}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Η μετάφραση απέτυχε.");
    } finally {
      setTranslating(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          if (!e.target.value) setOriginal(null);
        }}
        placeholder="Γράψτε μήνυμα στον επισκέπτη…"
        aria-label="Μήνυμα"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={!content.trim() || !aiEnabled}
            loading={translating}
            onClick={translate}
            title={aiEnabled ? undefined : "Χρειάζεται σύνδεση με μοντέλο AI (AI_API_KEY)"}
          >
            <Languages /> Μετάφραση{guestLanguageName ? ` στα ${guestLanguageName.toLowerCase()}` : ""}
          </Button>
          {original !== null && (
            <Button size="sm" variant="ghost" onClick={() => { setContent(original); setOriginal(null); }}>
              <Undo2 /> Αρχικό κείμενο
            </Button>
          )}
          {!aiEnabled && <span className="text-[11px] text-muted-foreground">Η μετάφραση χρειάζεται κλειδί AI</span>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={!content.trim()} onClick={() => submit(false)}>Αποθήκευση προχείρου</Button>
          <Button size="sm" disabled={!content.trim()} loading={pending} onClick={() => submit(true)}><Send /> Αποστολή</Button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">Εσωτερικό κανάλι — η αποστολή μέσω email/SMS/πλατφορμών έρχεται σε επόμενη φάση.</p>
    </div>
  );
}
