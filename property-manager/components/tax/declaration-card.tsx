"use client";

import { Check, Copy, ExternalLink, Wand2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AADE_PORTAL_URL } from "@/lib/aade";
import { autofillPayload } from "@/lib/aade-autofill";
import { formatDay } from "@/lib/format";
import { DeclareButton } from "./actions";

interface Field { key: string; label: string; value: string | null; optional?: boolean; hint?: string; fix?: "guest" | "reservation" | "property" }

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    toast.error("Η αντιγραφή απέτυχε — επιλέξτε το κείμενο και αντιγράψτε το.");
    return false;
  }
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      aria-label={`Αντιγραφή: ${label}`}
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        }
      }}
    >
      {done ? <Check className="text-success" /> : <Copy />}
    </Button>
  );
}

/**
 * The AADE stay declaration ready to copy, field by field, into the form of
 * the Μητρώο Βραχυχρόνιας Διαμονής, with its labels and in its order (there is
 * no public AADE interface to submit it automatically).
 */
export function DeclarationCard({
  reservationId,
  guestId,
  propertyId,
  form,
  declaration,
  canDeclare,
}: {
  reservationId: string;
  guestId: string;
  propertyId: string;
  form: { fields: Field[]; missing: string[]; paymentMethodIsDefault: boolean; cancelled: boolean };
  declaration: { status: string; deadline: string; overdue: boolean };
  /** The stay has ended (or was cancelled), so it can be declared. */
  canDeclare: boolean;
}) {
  const fixHref = (f: Field) => (f.fix === "guest" ? `/guests/${guestId}` : f.fix === "property" ? `/properties/${propertyId}` : null);
  const declared = declaration.status === "DECLARED";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {declared ? (
          <Badge tone="success">Δηλώθηκε</Badge>
        ) : (
          <Badge tone={declaration.overdue ? "danger" : "neutral"}>
            {declaration.overdue ? "Εκπρόθεσμη · " : "Προθεσμία "}
            {formatDay(declaration.deadline, { day: "numeric", month: "short", year: "numeric" })}
          </Badge>
        )}
        {form.cancelled && <Badge tone="warning">Ακύρωση με χρέωση</Badge>}
      </div>

      <ul className="divide-y divide-border rounded-xl border border-border">
        {form.fields.map((f) => (
          <li key={f.key} className="flex items-center justify-between gap-2 px-3 py-2">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">{f.label}</div>
              {f.value ? (
                <div className="truncate font-medium">
                  {f.value}
                  {f.key === "paymentMethod" && form.paymentMethodIsDefault && <span className="ml-1 text-xs font-normal text-muted-foreground">(προεπιλογή πλατφόρμας)</span>}
                </div>
              ) : f.optional ? (
                <div className="text-muted-foreground">— <span className="text-xs">{f.hint ? `(${f.hint})` : null}</span></div>
              ) : (
                <div className="text-warning">
                  Λείπει
                  {fixHref(f) ? (
                    <> · <Link href={fixHref(f)!} className="underline underline-offset-4">συμπληρώστε</Link></>
                  ) : (
                    <span className="text-xs text-muted-foreground"> · από «Επεξεργασία» της κράτησης</span>
                  )}
                </div>
              )}
            </div>
            {f.value && <CopyButton text={f.value} label={f.label} />}
          </li>
        ))}
      </ul>

      <p className="hidden text-xs text-muted-foreground md:block">
        Στον υπολογιστή: «Αυτόματη συμπλήρωση» και μετά ο σελιδοδείκτης «Συμπλήρωση ΑΑΔΕ» στη φόρμα της ΑΑΔΕ ·{" "}
        <Link href="/tax/autofill" className="underline underline-offset-4">πώς το βάζω</Link>
      </p>

      {form.missing.length > 0 && (
        <p className="text-xs text-muted-foreground">Το ΑΦΜ (Έλληνες) ή τον αριθμό διαβατηρίου / ταυτότητας Ε.Ε. (αλλοδαποί) τον ζητάτε από τον επισκέπτη, π.χ. στο check-in.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" asChild>
          <a href={AADE_PORTAL_URL} target="_blank" rel="noreferrer"><ExternalLink /> Άνοιγμα ΑΑΔΕ</a>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            if (await copyText(autofillPayload(form.fields)))
              toast.success("Έτοιμο για αυτόματη συμπλήρωση", { description: "Στη φόρμα της ΑΑΔΕ πατήστε τον σελιδοδείκτη «Συμπλήρωση ΑΑΔΕ»." });
          }}
        >
          <Wand2 /> Αυτόματη συμπλήρωση
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            const text = form.fields.map((f) => `${f.label}: ${f.value ?? "—"}`).join("\n");
            if (await copyText(text)) toast.success("Αντιγράφηκαν όλα τα στοιχεία");
          }}
        >
          <Copy /> Αντιγραφή όλων
        </Button>
        {canDeclare && <DeclareButton reservationId={reservationId} declared={declared} />}
      </div>
    </div>
  );
}
