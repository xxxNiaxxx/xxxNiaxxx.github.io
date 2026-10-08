"use client";

import { useState } from "react";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";

/** Daily reminder emails (deadlines) and the monthly report, for owners and admins. */
export function RemindersToggle({ initial, disabled }: { initial: boolean; disabled?: boolean }) {
  const [on, setOn] = useState(initial);
  const { run, pending } = useMutation();
  return (
    <label className="flex items-start gap-3 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)]"
        checked={on}
        disabled={disabled || pending}
        onChange={(e) => {
          const next = e.target.checked;
          void run(() => api("/api/organization", { method: "PATCH", body: { emailReminders: next } }), {
            success: next ? "Οι υπενθυμίσεις ενεργοποιήθηκαν" : "Οι υπενθυμίσεις απενεργοποιήθηκαν",
            onSuccess: () => setOn(next),
          });
        }}
      />
      <span>
        <span className="font-medium">Υπενθυμίσεις με email</span>
        <span className="block text-muted-foreground">
          Κάθε πρωί, μόνο όταν κάτι λήγει: δηλώσεις διαμονής, ΤΑΚΚ, ασφάλεια, διπλοκρατήσεις, αιτήματα κράτησης. Και στις αρχές κάθε μήνα, ο προηγούμενος μήνας με μια ματιά. Στέλνονται στον ιδιοκτήτη και στους διαχειριστές.
        </span>
      </span>
    </label>
  );
}
