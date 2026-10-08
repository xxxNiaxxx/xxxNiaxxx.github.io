"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/input";
import type { AIMemoryDTO } from "@/lib/ai/memory";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import { formatDateTime } from "@/lib/format";
import { languageName } from "@/lib/i18n/guest-language";
import { cn } from "@/lib/utils";

const KIND_LABELS = {
  GUEST_INFO: "Πληροφορία για επισκέπτες",
  PREFERENCE: "Προτίμηση ομάδας",
  MESSAGE_TEMPLATE: "Πρότυπο μηνύματος",
} as const;
const MESSAGE_KIND_LABELS: Record<string, string> = { checkin: "Οδηγίες άφιξης", thanks: "Ευχαριστήριο", general: "Γενικό" };
const SOURCE_LABELS: Record<string, string> = { MANUAL: "Προστέθηκε χειροκίνητα", CHAT: "Από συνομιλία", EDIT: "Από διόρθωσή σας" };

/** Highlights {name}-style placeholders in learned templates. */
function TemplateText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\{(?:name|property|checkIn|checkOut)\})/g).map((part, i) =>
        /^\{\w+\}$/.test(part) ? (
          <span key={i} className="rounded bg-accent-soft px-1 font-medium text-accent">
            {{ "{name}": "όνομα", "{property}": "ακίνητο", "{checkIn}": "άφιξη", "{checkOut}": "αναχώρηση" }[part] ?? part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function AddMemoryForm({ properties, defaultPropertyId, onAdded }: { properties: { id: string; name: string }[]; defaultPropertyId?: string; onAdded?: () => void }) {
  const [kind, setKind] = useState<"GUEST_INFO" | "PREFERENCE">("GUEST_INFO");
  const [propertyId, setPropertyId] = useState(defaultPropertyId ?? "");
  const [content, setContent] = useState("");
  const { run, pending, fieldErrors } = useMutation();
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => api("/api/ai/memories", { body: { kind, propertyId, content } }), {
          success: "Ο βοηθός το έμαθε",
          onSuccess: () => {
            setContent("");
            onAdded?.();
          },
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Τύπος" htmlFor="memory-kind">
          <Select id="memory-kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="GUEST_INFO">Πληροφορία για επισκέπτες</option>
            <option value="PREFERENCE">Προτίμηση ομάδας</option>
          </Select>
        </Field>
        <Field label="Ακίνητο" htmlFor="memory-property">
          <Select id="memory-property" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="">Όλα τα ακίνητα</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
      </div>
      <Field
        label="Τι να μάθει ο βοηθός"
        htmlFor="memory-content"
        error={fieldErrors.content}
        hint={kind === "GUEST_INFO" ? "π.χ. «Wi-Fi: VillaElia_Guest / κωδικός elia2024» — μπαίνει στις οδηγίες άφιξης" : "π.χ. «Υπογράφουμε πάντα: Η ομάδα του Demo Hospitality»"}
      >
        <Textarea id="memory-content" value={content} onChange={(e) => setContent(e.target.value)} className="min-h-20" />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={pending} disabled={content.trim().length < 3}><Plus /> Προσθήκη</Button>
      </div>
    </form>
  );
}

export function MemoryItem({ memory }: { memory: AIMemoryDTO }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(memory.content);
  const { run, pending } = useMutation();
  const save = (body: Record<string, unknown>, success: string) =>
    run(() => api(`/api/ai/memories/${memory.id}`, { method: "PATCH", body }), { success, onSuccess: () => setEditing(false) });
  return (
    <li className={cn("rounded-xl border border-border p-4", !memory.active && "opacity-60")}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone={memory.kind === "MESSAGE_TEMPLATE" ? "accent" : memory.kind === "GUEST_INFO" ? "info" : "neutral"}>{KIND_LABELS[memory.kind]}</Badge>
        {memory.propertyName && <Badge>{memory.propertyName}</Badge>}
        {memory.messageKind && <Badge>{MESSAGE_KIND_LABELS[memory.messageKind] ?? memory.messageKind}</Badge>}
        {memory.language && <Badge>{languageName(memory.language)}</Badge>}
        {!memory.active && <Badge tone="warning">Ανενεργό</Badge>}
        <span className="ml-auto text-[11px] text-muted-foreground">{SOURCE_LABELS[memory.source]} · {formatDateTime(memory.updatedAt)}</span>
      </div>
      {editing ? (
        <div className="grid gap-2">
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-28" aria-label="Επεξεργασία" />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setContent(memory.content); }}>Ακύρωση</Button>
            <Button size="sm" loading={pending} onClick={() => save({ content }, "Ενημερώθηκε")}>Αποθήκευση</Button>
          </div>
        </div>
      ) : (
        <p className="text-sm whitespace-pre-line">{memory.kind === "MESSAGE_TEMPLATE" ? <TemplateText text={memory.content} /> : memory.content}</p>
      )}
      {!editing && (
        <div className="mt-3 flex justify-end gap-1">
          <Button size="xs" variant="ghost" onClick={() => save({ active: !memory.active }, memory.active ? "Απενεργοποιήθηκε" : "Ενεργοποιήθηκε")}>
            {memory.active ? "Απενεργοποίηση" : "Ενεργοποίηση"}
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setEditing(true)}><Pencil /> Επεξεργασία</Button>
          <Button
            size="xs"
            variant="ghost"
            className="text-danger"
            onClick={() => confirm("Να ξεχάσει ο βοηθός αυτή τη γνώση;") && run(() => api(`/api/ai/memories/${memory.id}`, { method: "DELETE" }), { success: "Διαγράφηκε" })}
          >
            <Trash2 /> Διαγραφή
          </Button>
        </div>
      )}
    </li>
  );
}
