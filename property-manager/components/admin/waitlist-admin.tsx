"use client";

import { Check, Copy, Download, Mail, MailWarning, Smartphone, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, Stat } from "@/components/ui/misc";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import { formatDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WaitlistEntryDTO } from "@/lib/services/waitlist";
import { WAITLIST_PLATFORMS } from "@/lib/waitlist-options";

type Status = WaitlistEntryDTO["status"];

const STATUS: Record<Status, { label: string; tone: BadgeTone }> = {
  PENDING: { label: "Σε αναμονή", tone: "warning" },
  APPROVED: { label: "Εγκρίθηκε", tone: "accent" },
  REJECTED: { label: "Απορρίφθηκε", tone: "neutral" },
  REGISTERED: { label: "Έφτιαξε λογαριασμό", tone: "success" },
};
const DEVICES: Record<string, string> = { ANDROID: "Android", IPHONE: "iPhone", NONE: "Μόνο υπολογιστής" };
const REGIMES: Record<string, string> = { INDIVIDUAL: "Ιδιώτης", BUSINESS: "Επιχείρηση" };

async function copy(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    toast.error("Η αντιγραφή απέτυχε — επιλέξτε το κείμενο και αντιγράψτε το.");
  }
}

export function WaitlistAdmin({
  entries,
  registrationOpen,
  emailReady,
  playTestingUrl,
}: {
  entries: WaitlistEntryDTO[];
  registrationOpen: boolean;
  emailReady: boolean;
  playTestingUrl: string | null;
}) {
  const { run, pending } = useMutation();
  const [filter, setFilter] = useState<Status | "ALL">("PENDING");
  const [link, setLink] = useState<{ name: string; email: string; url: string; emailed: boolean } | null>(null);

  const count = (s: Status) => entries.filter((e) => e.status === s).length;
  const shown = filter === "ALL" ? entries : entries.filter((e) => e.status === filter);
  // Testers to add on Google Play: Android users who got access.
  const playEmails = entries
    .filter((e) => e.device === "ANDROID" && e.playEmail && (e.status === "APPROVED" || e.status === "REGISTERED"))
    .map((e) => e.playEmail!);

  const approve = (e: WaitlistEntryDTO) =>
    run(() => api<{ path: string; emailed: boolean }>(`/api/admin/waitlist/${e.id}/approve`, { method: "POST" }), {
      success: e.status === "APPROVED" ? "Νέος σύνδεσμος δημιουργήθηκε" : "Εγκρίθηκε",
      onSuccess: (r) => setLink({ name: e.name, email: e.email, url: `${window.location.origin}${r.path}`, emailed: r.emailed }),
    });

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Σε αναμονή" value={count("PENDING")} />
        <Stat label="Εγκρίθηκαν" value={count("APPROVED")} hint="δεν έχουν φτιάξει ακόμη λογαριασμό" />
        <Stat label="Έφτιαξαν λογαριασμό" value={count("REGISTERED")} />
        <Stat label="Android" value={entries.filter((e) => e.device === "ANDROID").length} hint={`${playEmails.length} με πρόσβαση`} />
      </div>

      <Card>
        <CardHeader title="Ρυθμίσεις" />
        <CardContent className="grid gap-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--color-accent)]"
              checked={registrationOpen}
              disabled={pending}
              onChange={(ev) =>
                run(() => api("/api/admin/settings", { method: "PATCH", body: { registrationOpen: ev.target.checked } }), {
                  success: ev.target.checked ? "Η εγγραφή άνοιξε για όλους" : "Η εγγραφή έκλεισε",
                })
              }
            />
            <span className="text-sm">
              <span className="font-medium">Ανοιχτή εγγραφή για όλους</span>
              <span className="block text-muted-foreground">
                {registrationOpen
                  ? "Οποιοσδήποτε φτιάχνει λογαριασμό χωρίς έγκριση."
                  : "Λογαριασμό φτιάχνουν μόνο όσοι έχουν σύνδεσμο έγκρισης ή πρόσκληση σε ομάδα. Οι υπόλοιποι πηγαίνουν στη λίστα αναμονής."}
              </span>
            </span>
          </label>
          <div className={cn("flex items-start gap-2.5 rounded-lg px-3 py-2 text-sm", emailReady ? "bg-success-soft text-success" : "bg-warning-soft text-warning")}>
            {emailReady ? <Mail className="mt-0.5 size-4 shrink-0" /> : <MailWarning className="mt-0.5 size-4 shrink-0" />}
            <span>
              {emailReady
                ? "Τα email στέλνονται αυτόματα: επιβεβαίωση αίτησης, ειδοποίηση σε εσάς και σύνδεσμος έγκρισης."
                : "Δεν έχει ρυθμιστεί αποστολή email (SMTP_HOST, SMTP_USER, SMTP_PASSWORD). Μετά την έγκριση αντιγράψτε τον σύνδεσμο και στείλτε τον με το χέρι."}
            </span>
          </div>
          <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <Smartphone className="mt-0.5 size-4 shrink-0" />
            <span>
              {playTestingUrl
                ? <>Οι χρήστες Android λαμβάνουν στο email έγκρισης και τον σύνδεσμο δοκιμής του Google Play.</>
                : <>Ορίστε το PLAY_TESTING_URL (σύνδεσμος δοκιμής από το Play Console) για να μπαίνει στο email έγκρισης των χρηστών Android.</>}
              {" "}Προσθέστε τα Gmail τους στη λίστα δοκιμαστών του Play Console.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={!playEmails.length} onClick={() => copy(playEmails.join(", "), `Αντιγράφηκαν ${playEmails.length} email`)}>
              <Copy /> Αντιγραφή Gmail για Google Play ({playEmails.length})
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={"/api/admin/waitlist/export"} download><Download /> Εξαγωγή CSV</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {link && <AccessLink {...link} onClose={() => setLink(null)} />}

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Φίλτρο κατάστασης">
        {(["PENDING", "APPROVED", "REGISTERED", "REJECTED", "ALL"] as const).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={filter === s}
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-full px-3 py-1 text-[13px] font-medium ring-1 ring-border",
              filter === s ? "bg-primary text-primary-foreground ring-primary" : "bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {s === "ALL" ? `Όλοι (${entries.length})` : `${STATUS[s].label} (${count(s)})`}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState title="Καμία αίτηση εδώ" description="Οι νέες αιτήσεις από τη σελίδα «Θέλω να δοκιμάσω» εμφανίζονται εδώ." />
      ) : (
        <ul className="grid gap-3">
          {shown.map((e) => (
            <li key={e.id}>
              <Card>
                <CardContent className="grid gap-3 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium">{e.name}</div>
                      <div className="truncate text-sm text-muted-foreground">
                        {e.email}{e.phone && ` · ${e.phone}`}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {e.linkExpired && <Badge tone="danger">Ο σύνδεσμος έληξε</Badge>}
                      <Badge tone={STATUS[e.status].tone}>{STATUS[e.status].label}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                    <span>Αίτηση {formatDay(e.createdAt.slice(0, 10), { day: "numeric", month: "short", year: "numeric" })}</span>
                    {e.city && <span>{e.city}</span>}
                    {e.propertiesCount && <span>{e.propertiesCount} {e.propertiesCount === 1 ? "ακίνητο" : "ακίνητα"}</span>}
                    {e.platforms.length > 0 && <span>{e.platforms.map((p) => WAITLIST_PLATFORMS[p] ?? p).join(", ")}</span>}
                    {e.regime && <span>{REGIMES[e.regime] ?? e.regime}</span>}
                    {e.device && <span>{DEVICES[e.device] ?? e.device}{e.playEmail && e.playEmail !== e.email ? ` · Play: ${e.playEmail}` : ""}</span>}
                    {e.status === "APPROVED" && e.approvedAt && (
                      <span>{e.approvalEmailedAt ? "Ο σύνδεσμος στάλθηκε με email" : "Ο σύνδεσμος δεν στάλθηκε με email"}</span>
                    )}
                  </div>
                  {e.message && <p className="rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-line">{e.message}</p>}

                  {e.status !== "REGISTERED" && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={pending} onClick={() => approve(e)}>
                        <Check /> {e.status === "APPROVED" ? "Νέος σύνδεσμος" : "Έγκριση"}
                      </Button>
                      {e.status !== "REJECTED" && (
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => api(`/api/admin/waitlist/${e.id}/reject`, { method: "POST" }), { success: "Απορρίφθηκε" })}>
                          <X /> Απόρριψη
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => {
                          if (!confirm(`Οριστική διαγραφή της αίτησης και των στοιχείων του/της ${e.name};`)) return;
                          run(() => api(`/api/admin/waitlist/${e.id}`, { method: "DELETE" }), { success: "Η αίτηση διαγράφηκε" });
                        }}
                      >
                        <Trash2 /> Διαγραφή
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AccessLink({ name, email, url, emailed, onClose }: { name: string; email: string; url: string; emailed: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-2 rounded-xl border border-accent/30 bg-accent-soft/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px]">
          {emailed
            ? <>Εγκρίθηκε: <b>{name}</b>. Ο σύνδεσμος εγγραφής στάλθηκε στο <b>{email}</b>· μπορείτε να τον στείλετε και με Viber ή WhatsApp.</>
            : <>Εγκρίθηκε: <b>{name}</b>. Το email δεν στάλθηκε — στείλτε αυτόν τον σύνδεσμο στο <b>{email}</b> με το χέρι. Εμφανίζεται μόνο τώρα.</>}
        </p>
        <button type="button" onClick={onClose} aria-label="Κλείσιμο" className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
      </div>
      <Input readOnly value={url} onFocus={(ev) => ev.currentTarget.select()} className="font-mono text-xs" aria-label="Σύνδεσμος εγγραφής" />
      <div>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            await copy(url, "Αντιγράφηκε");
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check /> : <Copy />} {copied ? "Αντιγράφηκε" : "Αντιγραφή"}
        </Button>
      </div>
    </div>
  );
}
