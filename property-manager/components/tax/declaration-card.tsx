"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AADE_PORTAL_URL } from "@/lib/aade";
import { formatDay } from "@/lib/format";
import { DeclareButton } from "./actions";

interface Field { key: string; label: string; value: string | null; optional?: boolean }

/** Where each missing value is filled in. */
const FIX: Record<string, "guest" | "reservation" | "property"> = {
  ama: "property",
  bookingNumber: "reservation",
  guestName: "guest",
  idNumber: "guest",
  paymentMethod: "reservation",
  amount: "reservation",
};

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
 * The AADE stay declaration ready to copy, field by field, into myAADE
 * (there is no public AADE interface to submit it automatically).
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
  const fixHref = (key: string) =>
    FIX[key] === "guest" ? `/guests/${guestId}` : FIX[key] === "property" ? `/properties/${propertyId}` : null;
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
                <div className="text-muted-foreground">— <span className="text-xs">(χωρίς αριθμό κράτησης· συμπληρώστε τον από «Επεξεργασία» αν υπάρχει)</span></div>
              ) : (
                <div className="text-warning">
                  Λείπει
                  {fixHref(f.key) ? (
                    <> · <Link href={fixHref(f.key)!} className="underline underline-offset-4">συμπληρώστε</Link></>
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

      {form.missing.length > 0 && (
        <p className="text-xs text-muted-foreground">Το ΑΦΜ (Έλληνες) ή τον αριθμό διαβατηρίου (ξένοι) τον ζητάτε από τον επισκέπτη, π.χ. στο check-in.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" asChild>
          <a href={AADE_PORTAL_URL} target="_blank" rel="noreferrer"><ExternalLink /> Άνοιγμα ΑΑΔΕ</a>
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
