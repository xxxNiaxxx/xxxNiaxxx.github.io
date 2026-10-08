"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";

export function GuestNotes({ guestId, notes }: { guestId: string; notes: string | null }) {
  const [value, setValue] = useState(notes ?? "");
  const { run, pending } = useMutation();
  const dirty = value !== (notes ?? "");
  return (
    <div className="grid gap-2">
      <Textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder="Προσθέστε σημείωση για τον επισκέπτη…" className="min-h-28" aria-label="Σημειώσεις επισκέπτη" />
      <div className="flex justify-end">
        <Button size="sm" disabled={!dirty} loading={pending} onClick={() => run(() => api(`/api/guests/${guestId}`, { method: "PATCH", body: { notes: value } }), { success: "Οι σημειώσεις αποθηκεύτηκαν" })}>
          Αποθήκευση σημειώσεων
        </Button>
      </div>
    </div>
  );
}
