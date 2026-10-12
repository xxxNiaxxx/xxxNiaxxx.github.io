"use client";

import { ArrowLeft, ArrowRight, Check, Copy, ExternalLink, Footprints } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { AADE_PORTAL_URL } from "@/lib/aade";
import { declarationSteps, type DeclarationField } from "@/lib/declaration-steps";
import { DeclareButton } from "./actions";

/**
 * The AADE declaration one field at a time, for the phone: what to do on the
 * AADE form, and a big «Αντιγραφή» button for what has to be pasted. Lists
 * (payment method, platform) and the «Αλλοδαπός» box only say what to pick.
 */
export function DeclarationSteps({
  fields,
  reservationId,
  declared,
  canDeclare,
  fixHref,
}: {
  fields: DeclarationField[];
  reservationId: string;
  declared: boolean;
  canDeclare: boolean;
  fixHref: (f: DeclarationField) => string | null;
}) {
  const steps = declarationSteps(fields);
  const [i, setI] = useState(0);
  const [copied, setCopied] = useState<number | null>(null);
  const step = steps[i];
  const last = i === steps.length - 1;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(i);
    } catch {
      toast.error("Η αντιγραφή απέτυχε — πατήστε παρατεταμένα το κείμενο και αντιγράψτε το.");
    }
  };

  return (
    <Dialog onOpenChange={(open) => open && (setI(0), setCopied(null))}>
      <DialogTrigger asChild>
        <Button size="sm"><Footprints /> Βήμα-βήμα</Button>
      </DialogTrigger>
      <DialogContent title="Δήλωση στην ΑΑΔΕ, βήμα-βήμα" description={`Βήμα ${i + 1} από ${steps.length}`}>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
          <h3 className="text-base font-semibold">{step.title}</h3>
          <ol className="grid list-decimal gap-1.5 pl-5 text-sm">
            {step.instructions.map((t) => <li key={t}>{t}</li>)}
          </ol>

          {step.kind === "start" && (
            <Button asChild variant="outline">
              <a href={AADE_PORTAL_URL} target="_blank" rel="noreferrer"><ExternalLink /> Άνοιγμα ΑΑΔΕ</a>
            </Button>
          )}

          {step.value && (
            <div className="rounded-xl border-2 border-accent/40 bg-accent-soft/40 px-4 py-3 text-center text-lg font-semibold break-words">
              {step.value}
            </div>
          )}

          {step.kind === "copy" && step.value && (
            <Button size="lg" onClick={() => copy(step.value!)}>
              {copied === i ? <><Check /> Αντιγράφηκε</> : <><Copy /> Αντιγραφή</>}
            </Button>
          )}

          {step.kind === "copy" && copied === i && <p className="text-center text-sm text-muted-foreground">Τώρα επικόλληση στην ΑΑΔΕ και μετά «Επόμενο».</p>}

          {step.kind === "missing" && (
            <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
              Λείπει. Συμπληρώστε το πρώτα
              {fixHref(step.field!) && <> · <Link href={fixHref(step.field!)!} className="underline underline-offset-4">εδώ</Link></>}
              , και μετά συνεχίστε.
            </p>
          )}

          {step.kind === "end" && canDeclare && (
            <div><DeclareButton reservationId={reservationId} declared={declared} /></div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <Button variant="ghost" disabled={i === 0} onClick={() => setI(i - 1)}><ArrowLeft /> Πίσω</Button>
          {!last && <Button variant={step.kind === "copy" && copied !== i ? "outline" : "default"} onClick={() => setI(i + 1)}>Επόμενο <ArrowRight /></Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
