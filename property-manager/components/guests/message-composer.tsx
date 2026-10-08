"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";

/** Phase 1: messages are recorded on the INTERNAL channel (no real delivery). */
export function MessageComposer({ guestId, reservationId }: { guestId?: string; reservationId?: string }) {
  const [content, setContent] = useState("");
  const { run, pending } = useMutation();
  const submit = (send: boolean) =>
    run(() => api("/api/messages", { body: { guestId, reservationId, content, send } }), {
      success: send ? "Το μήνυμα καταγράφηκε ως σταλμένο" : "Το πρόχειρο αποθηκεύτηκε",
      onSuccess: () => setContent(""),
    });
  return (
    <div className="grid gap-2">
      <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Γράψτε μήνυμα στον επισκέπτη…" aria-label="Μήνυμα" />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">Εσωτερικό κανάλι — η αποστολή μέσω email/SMS/πλατφορμών έρχεται σε επόμενη φάση.</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={!content.trim()} onClick={() => submit(false)}>Αποθήκευση προχείρου</Button>
          <Button size="sm" disabled={!content.trim()} loading={pending} onClick={() => submit(true)}><Send /> Αποστολή</Button>
        </div>
      </div>
    </div>
  );
}
