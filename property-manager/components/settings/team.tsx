"use client";

import { Check, Copy, Link2, Share2, UserMinus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import { formatDay, humanize } from "@/lib/format";
import type { InvitationDTO } from "@/lib/services/invitations";
import type { MemberDTO } from "@/lib/services/members";

type Role = "OWNER" | "ADMIN" | "MEMBER";

const ROLE_HINTS: Record<"ADMIN" | "MEMBER", string> = {
  ADMIN: "Διαχειρίζεται τα πάντα και προσκαλεί μέλη",
  MEMBER: "π.χ. συνεργείο καθαρισμού — βλέπει και ενημερώνει εργασίες και κρατήσεις",
};

export function TeamPanel({
  members,
  invitations,
  currentUserId,
  currentRole,
}: {
  members: MemberDTO[];
  invitations: InvitationDTO[];
  currentUserId: string;
  currentRole: Role;
}) {
  const router = useRouter();
  const canInvite = currentRole === "OWNER" || currentRole === "ADMIN";
  const { run, pending, fieldErrors: err } = useMutation();
  const action = useMutation();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [link, setLink] = useState<{ email: string; url: string } | null>(null);

  async function invite(target: { email: string; role: "ADMIN" | "MEMBER" }) {
    await run(() => api<{ path: string }>("/api/invitations", { body: target }), {
      success: "Η πρόσκληση δημιουργήθηκε",
      onSuccess: (r) => {
        setLink({ email: target.email, url: `${window.location.origin}${r.path}` });
        setEmail("");
      },
    });
  }

  const canRemove = (m: MemberDTO) =>
    m.role !== "OWNER" && m.userId !== currentUserId && (currentRole === "OWNER" || (currentRole === "ADMIN" && m.role === "MEMBER"));

  return (
    <>
      <ul className="divide-y divide-border">
        {members.map((m) => (
          <li key={m.userId} className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{m.name}{m.userId === currentUserId && <span className="text-muted-foreground"> (εσείς)</span>}</div>
              <div className="truncate text-xs text-muted-foreground">{m.email}</div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {currentRole === "OWNER" && m.role !== "OWNER" ? (
                <Select
                  aria-label={`Ρόλος του ${m.name}`}
                  className="h-8 w-auto text-xs"
                  value={m.role}
                  disabled={action.pending}
                  onChange={(e) => action.run(() => api(`/api/members/${m.userId}`, { method: "PATCH", body: { role: e.target.value } }), { success: "Ο ρόλος άλλαξε" })}
                >
                  <option value="ADMIN">Διαχειριστής</option>
                  <option value="MEMBER">Μέλος</option>
                </Select>
              ) : (
                <Badge tone={m.role === "OWNER" ? "dark" : m.role === "ADMIN" ? "accent" : "neutral"}>{humanize(m.role)}</Badge>
              )}
              {canRemove(m) && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  aria-label={`Αφαίρεση ${m.name}`}
                  disabled={action.pending}
                  onClick={() => {
                    if (!confirm(`Αφαίρεση του/της ${m.name} από την ομάδα; Οι ανοιχτές εργασίες του/της θα μείνουν χωρίς ανάθεση.`)) return;
                    action.run(() => api(`/api/members/${m.userId}`, { method: "DELETE" }), { success: "Το μέλος αφαιρέθηκε" });
                  }}
                >
                  <UserMinus className="size-4" />
                </Button>
              )}
              {m.userId === currentUserId && m.role !== "OWNER" && (
                <Button
                  size="xs"
                  variant="ghost"
                  disabled={action.pending}
                  onClick={() => {
                    if (!confirm("Αποχώρηση από την ομάδα; Θα χάσετε την πρόσβαση στα δεδομένα της.")) return;
                    action.run(() => api(`/api/members/${m.userId}`, { method: "DELETE" }), {
                      success: "Αποχωρήσατε από την ομάδα",
                      refresh: false,
                      onSuccess: () => router.push("/dashboard"),
                    });
                  }}
                >
                  Αποχώρηση
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {canInvite && (
        <div className="grid gap-4 border-t border-border px-5 py-4">
          <form
            noValidate
            className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void invite({ email, role });
            }}
          >
            <Field label="Πρόσκληση μέλους" htmlFor="inviteEmail" error={err.email}>
              <Input id="inviteEmail" type="email" placeholder="email@παράδειγμα.gr" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!err.email} />
            </Field>
            <Field label="Ρόλος" htmlFor="inviteRole">
              <Select id="inviteRole" value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "MEMBER")}>
                <option value="MEMBER">Μέλος</option>
                {currentRole === "OWNER" && <option value="ADMIN">Διαχειριστής</option>}
              </Select>
            </Field>
            <Button type="submit" loading={pending}><Link2 /> Δημιουργία συνδέσμου</Button>
          </form>
          <p className="-mt-2 text-xs text-muted-foreground">{ROLE_HINTS[role]}. Ο σύνδεσμος ισχύει 7 ημέρες και μόνο για αυτό το email.</p>

          {link && <InviteLink email={link.email} url={link.url} onClose={() => setLink(null)} />}

          {invitations.length > 0 && (
            <div className="grid gap-2">
              <div className="text-[13px] font-medium">Εκκρεμείς προσκλήσεις</div>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {invitations.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm">{i.email}</div>
                      <div className="text-xs text-muted-foreground">{humanize(i.role)} · λήγει {formatDay(i.expiresAt.slice(0, 10), { day: "numeric", month: "short" })}</div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="xs" variant="outline" disabled={pending} onClick={() => invite({ email: i.email, role: i.role as "ADMIN" | "MEMBER" })}>
                        Νέος σύνδεσμος
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        disabled={action.pending}
                        onClick={() => action.run(() => api(`/api/invitations/${i.id}`, { method: "DELETE" }), { success: "Η πρόσκληση ακυρώθηκε" })}
                      >
                        Ακύρωση
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function InviteLink({ email, url, onClose }: { email: string; url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = `Σας προσκαλώ στην ομάδα μου στο Βραχυχρόνια.ai: ${url}`;
  return (
    <div className="grid gap-2 rounded-xl border border-accent/30 bg-accent-soft/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px]">Στείλτε αυτόν τον σύνδεσμο στο <b>{email}</b> (Viber, WhatsApp, email…). Εμφανίζεται μόνο τώρα.</p>
        <button type="button" onClick={onClose} aria-label="Κλείσιμο" className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
      </div>
      <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" aria-label="Σύνδεσμος πρόσκλησης" />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              toast.error("Η αντιγραφή απέτυχε — επιλέξτε τον σύνδεσμο και αντιγράψτε τον.");
            }
          }}
        >
          {copied ? <Check /> : <Copy />} {copied ? "Αντιγράφηκε" : "Αντιγραφή"}
        </Button>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <Button size="sm" variant="outline" onClick={() => navigator.share({ text }).catch(() => {})}>
            <Share2 /> Κοινοποίηση
          </Button>
        )}
      </div>
    </div>
  );
}
