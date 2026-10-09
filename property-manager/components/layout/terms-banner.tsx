"use client";

import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";

/** Asks users who signed up before the current terms to accept them. */
export function TermsBanner() {
  const { run, pending } = useMutation();
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-info/30 bg-info-soft p-4 text-sm">
      <FileText className="size-5 shrink-0 text-info" />
      <p className="min-w-0 flex-1">
        Δημοσιεύσαμε <a href="/terms" target="_blank" className="font-medium underline underline-offset-4">Όρους χρήσης</a> και{" "}
        <a href="/dpa" target="_blank" className="font-medium underline underline-offset-4">Σύμβαση επεξεργασίας δεδομένων</a> (GDPR) και
        ενημερώσαμε την <a href="/privacy" target="_blank" className="font-medium underline underline-offset-4">Πολιτική απορρήτου</a>. Διαβάστε
        τα και αποδεχτείτε τα για να συνεχίσετε να χρησιμοποιείτε την εφαρμογή.
      </p>
      <Button size="sm" loading={pending} onClick={() => run(() => api("/api/me/terms", { method: "POST" }), { success: "Ευχαριστούμε" })}>
        Αποδέχομαι
      </Button>
    </div>
  );
}
