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
      success: send ? "Message recorded as sent" : "Draft saved",
      onSuccess: () => setContent(""),
    });
  return (
    <div className="grid gap-2">
      <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write a message to the guest…" aria-label="Message" />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">Internal channel — delivery integrations arrive in a later phase.</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={!content.trim()} onClick={() => submit(false)}>Save draft</Button>
          <Button size="sm" disabled={!content.trim()} loading={pending} onClick={() => submit(true)}><Send /> Send</Button>
        </div>
      </div>
    </div>
  );
}
