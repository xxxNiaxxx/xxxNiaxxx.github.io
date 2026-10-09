"use client";

import { CheckCircle2, CreditCard, Download } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DefinitionList } from "@/components/ui/misc";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import { formatDay } from "@/lib/format";
import type { BillingState } from "@/lib/services/billing";

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  active: { label: "Ενεργή", tone: "success" },
  trialing: { label: "Ενεργή · πρώτη χρέωση 1/1/2027", tone: "success" },
  past_due: { label: "Η πληρωμή απέτυχε", tone: "warning" },
  unpaid: { label: "Απλήρωτη", tone: "danger" },
  canceled: { label: "Ακυρώθηκε", tone: "neutral" },
  incomplete: { label: "Ημιτελής", tone: "warning" },
  incomplete_expired: { label: "Έληξε", tone: "neutral" },
  paused: { label: "Σε παύση", tone: "neutral" },
};

const formatDate = (iso: string) => formatDay(iso, { day: "numeric", month: "long", year: "numeric" });
const euro = (n: number) => `${n.toLocaleString("el-GR")} €`;

export function BillingPanel({ state, justSubscribed }: { state: BillingState; justSubscribed: boolean }) {
  const { run, pending } = useMutation();
  const go = (endpoint: string) =>
    run(() => api<{ url: string }>(endpoint, { method: "POST" }), { refresh: false, onSuccess: ({ url }) => window.location.assign(url) });
  const status = state.status ? STATUS[state.status] ?? { label: state.status, tone: "neutral" as const } : null;

  return (
    <div className="grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-6">
      {justSubscribed && (
        <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success-soft p-4 text-sm">
          <CheckCircle2 className="size-5 text-success" /> Ευχαριστούμε! Η συνδρομή ενεργοποιήθηκε — μπορεί να χρειαστούν λίγα δευτερόλεπτα για να φανεί εδώ.
        </div>
      )}
      {!state.hasAccess && (
        <div className="rounded-xl border border-warning/30 bg-warning-soft p-4 text-sm">
          <p className="font-medium">Η δωρεάν περίοδος έληξε.</p>
          <p className="mt-1 text-muted-foreground">
            Τα δεδομένα σας είναι ασφαλή. {state.canManage ? "Ενεργοποιήστε τη συνδρομή για να συνεχίσετε" : "Ζητήστε από τον ιδιοκτήτη του λογαριασμού να ενεργοποιήσει τη συνδρομή"}, ή κατεβάστε όλα τα δεδομένα σας.
          </p>
        </div>
      )}

      <Card>
        <CardHeader title="Η συνδρομή σας" action={status && <Badge tone={status.tone}>{status.label}</Badge>} />
        <CardContent className="grid gap-5">
          {state.exempt ? (
            <p className="text-sm">Ο λογαριασμός σας είναι δωρεάν, χωρίς χρέωση.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
                <p className="text-3xl font-semibold tracking-tight">{euro(state.pricePerProperty)}<span className="text-base font-normal text-muted-foreground"> / κατάλυμα / μήνα</span></p>
                <p className="text-sm text-muted-foreground">
                  {state.activeProperties} {state.activeProperties === 1 ? "ενεργό κατάλυμα" : "ενεργά καταλύματα"} → <strong className="text-foreground">{euro(state.monthlyTotal)} τον μήνα</strong>
                </p>
              </div>
              <ul className="grid gap-1.5 text-sm text-muted-foreground">
                <li>• Όλες οι λειτουργίες, χωρίς όριο κρατήσεων και μελών ομάδας.</li>
                <li>• Πληρώνετε μόνο τα ενεργά καταλύματα· η ποσότητα ενημερώνεται αυτόματα από τον επόμενο μήνα.</li>
                <li>• Πληρωμή με κάρτα μέσω Stripe. Ακύρωση με ένα κλικ, χωρίς δέσμευση.</li>
              </ul>
              {state.freePeriod && !state.subscribed && (
                <p className="rounded-lg bg-accent-soft p-3 text-sm text-accent">
                  Η εφαρμογή είναι δωρεάν μέχρι {formatDate(state.freeUntil)}. Αν ενεργοποιήσετε τη συνδρομή τώρα, η πρώτη χρέωση γίνεται 1 Ιανουαρίου 2027.
                </p>
              )}
              {state.subscribed && (
                <DefinitionList
                  items={[
                    { label: "Καταλύματα στη συνδρομή", value: state.quantity ?? "—" },
                    ...(state.currentPeriodEnd
                      ? [{ label: state.cancelAtPeriodEnd ? "Λήγει στις" : state.status === "trialing" ? "Πρώτη χρέωση" : "Επόμενη χρέωση", value: formatDate(state.currentPeriodEnd.slice(0, 10)) }]
                      : []),
                  ]}
                />
              )}
              {!state.configured ? (
                <p className="text-sm text-muted-foreground">Οι πληρωμές δεν έχουν ενεργοποιηθεί ακόμη. Θα σας ειδοποιήσουμε με email πριν από οποιαδήποτε χρέωση.</p>
              ) : !state.canManage ? (
                <p className="text-sm text-muted-foreground">Τη συνδρομή τη διαχειρίζονται ο ιδιοκτήτης και οι διαχειριστές του λογαριασμού.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {!state.subscribed && (
                    <Button loading={pending} onClick={() => go("/api/billing/checkout")}><CreditCard /> Ενεργοποίηση συνδρομής</Button>
                  )}
                  {state.hasCustomer && (
                    <Button variant="outline" loading={pending && state.subscribed} onClick={() => go("/api/billing/portal")}>Κάρτα, τιμολόγια, ακύρωση</Button>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {state.canManage && (
        <Card>
          <CardHeader title="Τα δεδομένα σας" description="Όλα όσα έχετε αποθηκεύσει (ακίνητα, κρατήσεις, επισκέπτες, οικονομικά, εργασίες), σε ένα αρχείο JSON. Λειτουργεί πάντα, με ή χωρίς συνδρομή." />
          <CardContent>
            <Button asChild variant="outline"><a href="/api/organization/export"><Download /> Εξαγωγή όλων των δεδομένων</a></Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
