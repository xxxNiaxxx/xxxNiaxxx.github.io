"use client";

import { BookOpen, Check, Copy, ExternalLink, Globe } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";

interface Links { guidePath: string; bookingPath: string }

/** The property's public pages: guest guide and direct booking page. */
export function GuestPagesCard({ propertyId, publicToken, directBooking, canEdit }: { propertyId: string; publicToken: string | null; directBooking: boolean; canEdit: boolean }) {
  const [links, setLinks] = useState<Links | null>(publicToken ? { guidePath: `/guide/${publicToken}`, bookingPath: `/book/${publicToken}` } : null);
  const [booking, setBooking] = useState(directBooking);
  const [copied, setCopied] = useState<string | null>(null);
  const { run, pending } = useMutation();
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function copy(path: string) {
    try {
      await navigator.clipboard.writeText(`${origin}${path}`);
      setCopied(path);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Η αντιγραφή απέτυχε.");
    }
  }

  const row = (icon: React.ReactNode, title: string, hint: string, path: string) => (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2 rounded-xl border border-border p-3">
      <div className="flex items-start gap-2">
        {icon}
        <div className="min-w-0">
          <div className="font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
      </div>
      <div className="truncate rounded-lg bg-muted px-3 py-1.5 font-mono text-xs">{origin}{path}</div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => copy(path)}>{copied === path ? <Check /> : <Copy />} Αντιγραφή</Button>
        <Button size="sm" variant="ghost" asChild><a href={path} target="_blank" rel="noreferrer"><ExternalLink /> Άνοιγμα</a></Button>
      </div>
    </div>
  );

  if (!links) {
    return (
      <div className="grid gap-2 text-sm">
        <p className="text-muted-foreground">Ένας ψηφιακός οδηγός για τους επισκέπτες (Wi-Fi, check-in, κανόνες — από τις «Πληροφορίες για επισκέπτες» παρακάτω) και μια σελίδα απευθείας κρατήσεων χωρίς προμήθεια.</p>
        <div>
          <Button size="sm" loading={pending} disabled={!canEdit} onClick={() => run(() => api<Links>(`/api/properties/${propertyId}/public-pages`, { method: "POST" }), { refresh: false, onSuccess: setLinks })}>
            <Globe /> Δημιουργία σελίδων
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 text-sm">
      {row(<BookOpen className="mt-0.5 size-4 shrink-0 text-accent" />, "Οδηγός επισκέπτη", "Στείλτε τον πριν την άφιξη ή βάλτε τον σε QR στο σπίτι. Μπαίνει και στο online check-in.", links.guidePath)}
      <label className="flex items-start gap-2.5 rounded-xl border border-border p-3">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)]"
          checked={booking}
          disabled={!canEdit || pending}
          onChange={(e) => {
            const on = e.target.checked;
            void run(() => api(`/api/properties/${propertyId}/public-pages`, { method: "PATCH", body: { directBooking: on } }), {
              success: on ? "Η σελίδα κρατήσεων άνοιξε" : "Η σελίδα κρατήσεων έκλεισε",
              refresh: false,
              onSuccess: () => setBooking(on),
            });
          }}
        />
        <span>
          <span className="font-medium">Απευθείας κρατήσεις</span>
          <span className="block text-xs text-muted-foreground">Ο επισκέπτης βλέπει διαθεσιμότητα και τιμή και στέλνει αίτημα. Το εγκρίνετε εσείς — χωρίς προμήθεια πλατφόρμας.</span>
        </span>
      </label>
      {booking && row(<Globe className="mt-0.5 size-4 shrink-0 text-accent" />, "Σελίδα κρατήσεων", "Δώστε τη σε επισκέπτες που ξαναέρχονται, στο Instagram ή στο site σας.", links.bookingPath)}
    </div>
  );
}
