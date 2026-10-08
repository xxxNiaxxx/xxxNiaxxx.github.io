"use client";

import { Check, Copy, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import { formatDateTime } from "@/lib/format";
import type { CalendarFeedDTO } from "@/lib/services/calendar-feeds";

const SOURCE: Record<string, string> = { AIRBNB: "Airbnb", BOOKING_COM: "Booking.com", OTHER: "Άλλη πλατφόρμα" };

/** iCal import (Airbnb/Booking → app) and export (app → Airbnb/Booking) for one property. */
export function CalendarSync({ propertyId, feeds, exportPath, canEdit }: { propertyId: string; feeds: CalendarFeedDTO[]; exportPath: string | null; canEdit: boolean }) {
  const { run, pending, fieldErrors: err } = useMutation();
  const sync = useMutation();
  const [source, setSource] = useState("AIRBNB");
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const exportUrl = exportPath && typeof window !== "undefined" ? `${window.location.origin}${exportPath}` : null;

  const summary = (r: { created: number; updated: number; cancelled: number; errors?: string[]; error?: string }) =>
    `${r.created} νέες, ${r.updated} αλλαγές, ${r.cancelled} ακυρώσεις${r.errors?.length || r.error ? " — με σφάλμα" : ""}`;

  return (
    <div className="grid gap-5 text-sm">
      <div className="grid gap-2">
        <div className="font-medium">Λήψη κρατήσεων από τις πλατφόρμες</div>
        <p className="text-[13px] text-muted-foreground">
          Οι νέες κρατήσεις έρχονται μόνες τους (κάθε φορά που ανοίγετε την εφαρμογή και μία φορά τη νύχτα). Το iCal δεν έχει ποσά ούτε ονόματα:
          συμπληρώστε τα ή κάντε <Link href="/reservations/import" className="underline">εισαγωγή του αρχείου κρατήσεων</Link> — θα ενημερωθούν οι ίδιες κρατήσεις.
        </p>
        {feeds.length > 0 && (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {feeds.map((f) => (
              <li key={f.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="font-medium">{SOURCE[f.source] ?? f.source}</div>
                  <div className="truncate text-xs text-muted-foreground">{f.url.replace(/^https:\/\//, "").slice(0, 60)}…</div>
                  <div className={`text-xs ${f.lastError ? "text-danger" : "text-muted-foreground"}`}>
                    {f.lastError ?? (f.lastSyncedAt ? `Τελευταίος συγχρονισμός ${formatDateTime(f.lastSyncedAt)}` : "Δεν έχει συγχρονιστεί")}
                  </div>
                </div>
                {canEdit && (
                  <Button size="icon" variant="ghost" className="size-8" aria-label="Αφαίρεση ημερολογίου" disabled={pending}
                    onClick={() => confirm("Αφαίρεση του ημερολογίου; Οι κρατήσεις που έφερε μένουν.") && run(() => api(`/api/calendars/${f.id}`, { method: "DELETE" }), { success: "Το ημερολόγιο αφαιρέθηκε" })}>
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <>
            <form
              className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                void run(() => api<{ result: { created: number; updated: number; cancelled: number; error?: string } }>(`/api/properties/${propertyId}/calendars`, { body: { source, url } }), {
                  success: "Το ημερολόγιο προστέθηκε",
                  onSuccess: (r) => {
                    setUrl("");
                    if (r.result.error) toast.error(r.result.error);
                    else toast.success(`Συγχρονισμός: ${summary(r.result)}`);
                  },
                });
              }}
            >
              <Field label="Πλατφόρμα" htmlFor="feed-source">
                <Select id="feed-source" value={source} onChange={(e) => setSource(e.target.value)}>
                  {Object.entries(SOURCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
              <Field label="Σύνδεσμος iCal (εξαγωγή) της πλατφόρμας" htmlFor="feed-url" error={err.url}>
                <Input id="feed-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.airbnb.com/calendar/ical/….ics" />
              </Field>
              <Button type="submit" loading={pending} disabled={!url.trim()} className="justify-self-start sm:col-span-2">Προσθήκη ημερολογίου</Button>
            </form>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Πού βρίσκω τον σύνδεσμο;</summary>
              <p className="mt-1"><b>Airbnb:</b> Ημερολόγιο → Διαθεσιμότητα → Σύνδεση ημερολογίων → «Σύνδεση σε άλλο ιστότοπο» → αντιγραφή του συνδέσμου.</p>
              <p className="mt-1"><b>Booking.com:</b> Extranet → Τιμές & Διαθεσιμότητα → Συγχρονισμός ημερολογίων → «Εξαγωγή ημερολογίου» → αντιγραφή του συνδέσμου.</p>
            </details>
            {feeds.length > 0 && (
              <Button variant="outline" size="sm" className="justify-self-start" loading={sync.pending}
                onClick={() => sync.run(() => api<{ created: number; updated: number; cancelled: number; errors: string[] }>("/api/calendars/sync", { body: { propertyId, force: true } }), {
                  onSuccess: (r) => (r.errors.length ? toast.error(r.errors[0]) : toast.success(`Συγχρονισμός: ${summary(r)}`)),
                })}>
                <RefreshCw /> Συγχρονισμός τώρα
              </Button>
            )}
          </>
        )}
      </div>

      <div className="grid gap-2 border-t border-border pt-4">
        <div className="font-medium">Αποστολή διαθεσιμότητας στις πλατφόρμες</div>
        <p className="text-[13px] text-muted-foreground">
          Βάλτε αυτόν τον σύνδεσμο στο Airbnb και στο Booking.com («Εισαγωγή ημερολογίου»), ώστε οι κρατήσεις που περνάτε εδώ (απευθείας, τηλέφωνο, άλλη πλατφόρμα) να κλείνουν τις ημερομηνίες και εκεί.
        </p>
        {exportUrl ? (
          <div className="grid gap-2">
            <Input readOnly value={exportUrl} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" aria-label="Σύνδεσμος εξαγωγής iCal" />
            <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={async () => {
              try { await navigator.clipboard.writeText(exportUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { toast.error("Επιλέξτε και αντιγράψτε τον σύνδεσμο"); }
            }}>{copied ? <Check /> : <Copy />} {copied ? "Αντιγράφηκε" : "Αντιγραφή"}</Button>
            {canEdit && (
              <Button variant="ghost" size="sm" disabled={pending}
                onClick={() => confirm("Νέος σύνδεσμος; Ο παλιός θα σταματήσει να λειτουργεί και πρέπει να ενημερώσετε τις πλατφόρμες.") && run(() => api(`/api/properties/${propertyId}/calendars/export`, { method: "POST" }), { success: "Δημιουργήθηκε νέος σύνδεσμος" })}>
                Νέος σύνδεσμος
              </Button>
            )}
            </div>
          </div>
        ) : canEdit ? (
          <Button variant="outline" size="sm" className="justify-self-start" loading={pending}
            onClick={() => run(() => api(`/api/properties/${propertyId}/calendars/export`, { method: "POST" }), { success: "Ο σύνδεσμος δημιουργήθηκε" })}>
            Δημιουργία συνδέσμου iCal
          </Button>
        ) : (
          <p className="text-[13px] text-muted-foreground">Δεν έχει δημιουργηθεί σύνδεσμος.</p>
        )}
      </div>
    </div>
  );
}
