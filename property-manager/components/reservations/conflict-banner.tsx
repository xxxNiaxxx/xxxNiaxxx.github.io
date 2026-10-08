"use client";

import { CalendarX2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import type { CalendarConflictDTO } from "@/lib/services/calendar-conflicts";

/** A platform calendar shows another stay on these dates: a possible double booking. */
export function ConflictBanner({ conflicts, reservationId, canDismiss }: { conflicts: CalendarConflictDTO[]; reservationId: string; canDismiss: boolean }) {
  const { run, pending } = useMutation();
  if (!conflicts.length) return null;
  return (
    <div className="mb-6 grid gap-3">
      {conflicts.map((c) => {
        const others = c.overlaps.filter((o) => o.id !== reservationId);
        return (
          <div key={c.id} role="alert" className="flex flex-col gap-3 rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm sm:flex-row sm:items-start">
            <CalendarX2 className="size-5 shrink-0 text-danger" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-danger">Πιθανή διπλοκράτηση</p>
              <p className="mt-1">
                Το ημερολόγιο <b>{c.sourceLabel}</b> δείχνει κράτηση <b>{c.startLabel} – {c.endLabel}</b>{c.code ? ` (${c.code})` : ""} στο {c.propertyName}, πάνω σε αυτή τη διαμονή
                {others.length > 0 && (
                  <> και στις: {others.map((o, i) => (
                    <span key={o.id}>{i > 0 && ", "}<Link href={`/reservations/${o.id}`} className="underline underline-offset-4">{o.guestName} ({o.sourceLabel} {o.checkInLabel}–{o.checkOutLabel})</Link></span>
                  ))}</>
                )}.
              </p>
              <p className="mt-1 text-muted-foreground">
                Ελέγξτε τις κρατήσεις στις πλατφόρμες. Αν είναι διπλοκράτηση, επικοινωνήστε άμεσα με τον έναν επισκέπτη. Βάλτε σε κάθε πλατφόρμα τον σύνδεσμο ημερολογίου του καταλύματος, για να κλείνουν οι ημερομηνίες.
              </p>
            </div>
            {canDismiss && (
              <Button size="sm" variant="outline" loading={pending} onClick={() => run(() => api(`/api/calendar-conflicts/${c.id}/dismiss`, { method: "POST" }), { success: "Σημειώθηκε ότι δεν είναι διπλοκράτηση" })}>
                Δεν είναι διπλοκράτηση
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
