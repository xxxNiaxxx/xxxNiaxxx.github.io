"use client";

import { Check, ClipboardList, MessageSquare, Pencil, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status";
import type { AIActionDTO } from "@/lib/ai/actions";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import { formatDateTime, humanize } from "@/lib/format";
import { cn } from "@/lib/utils";

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Proposed AI action. Nothing happens until the user presses Approve. */
export function ActionCard({ action, onChange }: { action: AIActionDTO; onChange?: (a: AIActionDTO) => void }) {
  const { run, pending } = useMutation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(str(action.payload.message));
  const p = action.payload;
  const isMessage = action.type === "SEND_GUEST_MESSAGE";
  const proposed = action.status === "PROPOSED";

  const call = (path: string, body?: unknown, success?: string) =>
    run(() => api<AIActionDTO>(`/api/ai/actions/${action.id}${path}`, { method: body ? "PATCH" : "POST", body }), {
      success,
      onSuccess: (a) => {
        if (a) onChange?.(a);
        setEditing(false);
      },
    });

  return (
    <div className={cn("rounded-xl border bg-surface p-4 shadow-[var(--shadow-card)]", proposed ? "border-warning/40" : "border-border")}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className={cn("rounded-lg p-1.5", proposed ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground")}>
            {isMessage ? <MessageSquare className="size-4" /> : <ClipboardList className="size-4" />}
          </span>
          {proposed ? (isMessage ? "Ready to send" : "Ready to create") : isMessage ? "Guest message" : "Task"}
        </div>
        <StatusBadge value={action.status} label={action.status === "EXECUTED" ? (isMessage ? "Sent" : "Created") : undefined} />
      </div>

      {isMessage ? (
        <>
          <p className="text-[13px] text-muted-foreground">
            To <span className="font-medium text-foreground">{str(p.guestName)}</span>
            {str(p.context) && <> · {str(p.context)}</>}
          </p>
          {editing ? (
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="mt-2 min-h-36" aria-label="Edit message" autoFocus />
          ) : (
            <p className="mt-2 rounded-lg bg-muted/60 p-3 text-sm whitespace-pre-line">{str(p.message)}</p>
          )}
        </>
      ) : (
        <div className="text-sm">
          <p className="font-medium">{str(p.title)}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {[str(p.propertyName), humanize(str(p.type) || "OTHER"), humanize(str(p.priority) || "MEDIUM"), str(p.dueAt) && `due ${formatDateTime(str(p.dueAt))}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      )}

      {action.status === "FAILED" && <p className="mt-2 text-xs text-danger">{str(action.result?.error) || "The action failed."}</p>}
      {action.status === "EXECUTED" && isMessage && <p className="mt-2 text-xs text-muted-foreground">Recorded as sent on the internal channel (simulated in Phase 1).</p>}

      {proposed && (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {editing ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(str(p.message)); }}>Discard</Button>
              <Button size="sm" variant="outline" loading={pending} disabled={!draft.trim()} onClick={() => call("", { message: draft }, "Message updated")}>Save</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" loading={pending} onClick={() => call("/reject", undefined, "Action cancelled")}><X /> Cancel</Button>
              {isMessage && <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil /> Edit</Button>}
              <Button size="sm" variant="accent" loading={pending} onClick={() => call("/approve", undefined, isMessage ? "Message sent" : "Task created")}><Check /> Approve</Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
