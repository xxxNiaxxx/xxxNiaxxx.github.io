"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { GuestFields } from "@/components/guests/guest-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SOURCE_LABELS } from "@/components/ui/status";
import { api, formValues } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import { diffDaysISO } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import type { ReservationDTO } from "@/lib/services/serializers";
import { climateFeeForStay, commissionFor, type PropertyKind, type TaxRegime } from "@/lib/tax/gr";
import { cn } from "@/lib/utils";

export interface PropertyOption {
  id: string;
  name: string;
  basePrice: number;
  currency: string;
  maxGuests: number;
  status: string;
  kind: string;
  areaSqm: number | null;
}
export interface GuestOption {
  id: string;
  fullName: string;
  email: string | null;
}

interface Props {
  properties: PropertyOption[];
  guests: GuestOption[];
  reservation?: ReservationDTO;
  pricing: { regime: TaxRegime; commissionRates: Record<string, number> };
  defaults?: { propertyId?: string; checkIn?: string; checkOut?: string };
  trigger?: React.ReactNode;
  /** Controlled open state (used for ?new=1 deep links). */
  defaultOpen?: boolean;
}

export function ReservationFormDialog({ properties, guests, reservation, pricing, defaults, trigger, defaultOpen }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const editing = Boolean(reservation);
  const { run, pending, fieldErrors: err } = useMutation();
  const [guestMode, setGuestMode] = useState<"existing" | "new">(guests.length ? "existing" : "new");
  const [propertyId, setPropertyId] = useState(reservation?.propertyId ?? defaults?.propertyId ?? properties.find((p) => p.status === "ACTIVE")?.id ?? "");
  const [checkIn, setCheckIn] = useState(reservation?.checkIn ?? defaults?.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(reservation?.checkOut ?? defaults?.checkOut ?? "");
  const [free, setFree] = useState(reservation?.complimentary ?? false);
  // New bookings: the amount is what the guest pays (Booking's "Συνολική τιμή κράτησης", with ΤΑΚΚ).
  const [includesFee, setIncludesFee] = useState(!reservation);
  const [amount, setAmount] = useState(reservation ? String(reservation.totalAmount) : "");
  const [source, setSource] = useState<string>(reservation?.source ?? "MANUAL");
  const [commission, setCommission] = useState(reservation && reservation.commission > 0 ? String(reservation.commission) : "");
  const property = properties.find((p) => p.id === propertyId);
  const nights = checkIn && checkOut && checkOut > checkIn ? diffDaysISO(checkIn, checkOut) : 0;
  const suggested = property && nights ? property.basePrice * nights : null;
  const dateError = checkIn && checkOut && checkOut <= checkIn ? "Η αναχώρηση πρέπει να είναι μετά την άφιξη" : undefined;
  const entered = Number(amount) || 0;
  const climateFee = property && nights && entered > 0 ? climateFeeForStay({ checkIn, checkOut, totalAmount: entered }, { kind: property.kind as PropertyKind, areaSqm: property.areaSqm }) : 0;
  const room = includesFee ? Math.max(0, Math.round((entered - climateFee) * 100) / 100) : entered;
  const rate = pricing.commissionRates[source] ?? 0;
  const autoCommission = room > 0 && rate > 0 ? commissionFor(room, rate, pricing.regime) : 0;
  const activeProperties = useMemo(() => properties.filter((p) => p.status === "ACTIVE" || p.id === reservation?.propertyId), [properties, reservation]);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next && params.get("new")) {
      const q = new URLSearchParams(params.toString());
      ["new", "propertyId", "checkIn", "checkOut"].forEach((k) => q.delete(k));
      router.replace(q.size ? `${pathname}?${q}` : pathname, { scroll: false });
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (dateError) return;
    const v = formValues(e.currentTarget);
    const newGuest = Object.fromEntries(Object.entries(v).filter(([k]) => k.startsWith("newGuest.")).map(([k, val]) => [k.slice(9), val]));
    const body: Record<string, unknown> = Object.fromEntries(Object.entries(v).filter(([k]) => !k.startsWith("newGuest.")));
    body.complimentary = free;
    if (free) body.totalAmount = 0;
    else {
      body.totalAmount = amount === "" ? undefined : Number(amount);
      body.amountIncludesClimateFee = includesFee;
      body.commission = commission === "" ? autoCommission : Number(commission);
    }
    if (!editing) {
      if (guestMode === "new") {
        body.newGuest = newGuest;
        delete body.guestId;
      }
    }
    await run(
      () => api<ReservationDTO>(editing ? `/api/reservations/${reservation!.id}` : "/api/reservations", { method: editing ? "PATCH" : "POST", body }),
      {
        success: editing ? "Η κράτηση ενημερώθηκε" : "Η κράτηση δημιουργήθηκε",
        onSuccess: (r) => {
          setOpen(false);
          if (!editing && r) router.push(`/reservations/${r.id}`);
          else if (params.get("new")) onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent title={editing ? "Επεξεργασία κράτησης" : "Νέα κράτηση"} description={editing ? undefined : "Χειροκίνητη καταχώριση — ο συγχρονισμός με Airbnb/Booking έρχεται σε επόμενη φάση."} wide>
        <form onSubmit={onSubmit} noValidate className="grid gap-5">
          <Field label="1. Ακίνητο" htmlFor="propertyId" error={err.propertyId}>
            <Select id="propertyId" name="propertyId" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} required>
              {activeProperties.map((p) => (
                <option key={p.id} value={p.id}>{p.name} · έως {p.maxGuests} άτομα</option>
              ))}
            </Select>
          </Field>

          {editing ? (
            <Field label="2. Επισκέπτης" htmlFor="guestId" error={err.guestId}>
              <Select id="guestId" name="guestId" defaultValue={reservation!.guestId}>
                {guests.map((g) => (
                  <option key={g.id} value={g.id}>{g.fullName}{g.email ? ` · ${g.email}` : ""}</option>
                ))}
              </Select>
            </Field>
          ) : (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium">2. Επισκέπτης</span>
                <div className="inline-flex rounded-lg bg-muted p-0.5 text-xs">
                  {(["existing", "new"] as const).map((m) => (
                    <button key={m} type="button" onClick={() => setGuestMode(m)} disabled={m === "existing" && !guests.length}
                      className={cn("rounded-md px-2.5 py-1 font-medium", guestMode === m ? "bg-surface shadow-sm" : "text-muted-foreground")}>
                      {m === "existing" ? "Υπάρχων επισκέπτης" : "Νέος επισκέπτης"}
                    </button>
                  ))}
                </div>
              </div>
              {guestMode === "existing" ? (
                <>
                  <Select id="guestId" name="guestId" aria-label="Επισκέπτης" defaultValue="" aria-invalid={!!err.guestId}>
                    <option value="" disabled>Επιλέξτε επισκέπτη…</option>
                    {guests.map((g) => (
                      <option key={g.id} value={g.id}>{g.fullName}{g.email ? ` · ${g.email}` : ""}</option>
                    ))}
                  </Select>
                  {err.guestId && <p className="text-xs text-danger">{err.guestId}</p>}
                </>
              ) : (
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <GuestFields err={err} prefix="newGuest." />
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="3. Άφιξη" htmlFor="checkIn" error={err.checkIn}>
              <Input id="checkIn" name="checkIn" type="date" required value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </Field>
            <Field label="4. Αναχώρηση" htmlFor="checkOut" error={dateError ?? err.checkOut}>
              <Input id="checkOut" name="checkOut" type="date" required min={checkIn || undefined} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} aria-invalid={!!(dateError ?? err.checkOut)} />
            </Field>
            <Field label="5. Άτομα" htmlFor="guestsCount" error={err.guestsCount} hint={property ? `Έως ${property.maxGuests}` : undefined}>
              <Input id="guestsCount" name="guestsCount" type="number" min={1} max={property?.maxGuests} defaultValue={reservation?.guestsCount ?? 2} required />
            </Field>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-3">
            <input type="checkbox" checked={free} onChange={(e) => setFree(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-accent)]" />
            <span className="grid gap-0.5">
              <span className="text-[13px] font-medium">Δωρεάν φιλοξενία</span>
              <span className="text-xs text-muted-foreground">Συγγενείς ή φίλοι χωρίς καμία πληρωμή. Δεν είναι μίσθωση: χωρίς έσοδο, ΤΑΚΚ και δήλωση στην ΑΑΔΕ.</span>
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={free ? "6. Ποσό" : includesFee ? "6. Συνολική τιμή κράτησης (με ΤΑΚΚ)" : "6. Τιμή δωματίου (χωρίς ΤΑΚΚ)"} htmlFor="totalAmount" error={err.totalAmount} hint={free ? "Χωρίς ενοίκιο" : suggested ? `Πρόταση ${formatMoney(suggested, property?.currency)} (${nights} × βασική τιμή)` : undefined}>
              {free ? (
                <Input key="free" id="totalAmount" type="number" value={0} disabled readOnly />
              ) : (
                <Input key="paid" id="totalAmount" type="number" min={0} step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={suggested ? String(suggested) : ""} />
              )}
            </Field>
            <Field label="7. Πηγή" htmlFor="source">
              <Select id="source" name="source" value={source} onChange={(e) => setSource(e.target.value)}>
                {Object.entries(SOURCE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </Select>
            </Field>
            <Field label="8. Κωδικός κράτησης" htmlFor="confirmationCode" error={err.confirmationCode}>
              <Input id="confirmationCode" name="confirmationCode" defaultValue={reservation?.confirmationCode ?? ""} placeholder="Προαιρετικό" />
            </Field>
          </div>

          {!free && (
            <div className="grid gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:grid-cols-[1fr_200px] sm:items-end">
              <label className="flex cursor-pointer items-start gap-2.5 text-[13px]">
                <input type="checkbox" checked={includesFee} onChange={(e) => setIncludesFee(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-accent)]" />
                <span>
                  <span className="font-medium">Το ποσό περιλαμβάνει ΤΑΚΚ</span>
                  <span className="block text-xs text-muted-foreground">
                    Όπως η «Συνολική τιμή κράτησης» του Booking. {entered > 0 && nights > 0 && (includesFee
                      ? `Τιμή δωματίου ${formatMoney(room)} + ΤΑΚΚ ${formatMoney(climateFee)}.`
                      : `Ο επισκέπτης πληρώνει ${formatMoney(entered + climateFee)} με το ΤΑΚΚ.`)}
                  </span>
                </span>
              </label>
              <Field label="Προμήθεια πλατφόρμας (€)" htmlFor="commission" error={err.commission}
                hint={rate > 0 ? `Κενό = αυτόματα ${rate}%${autoCommission ? ` (${formatMoney(autoCommission)})` : ""}` : "Χωρίς προμήθεια για αυτή την πηγή"}>
                <Input id="commission" type="number" min={0} step="0.01" value={commission} onChange={(e) => setCommission(e.target.value)} placeholder={autoCommission ? String(autoCommission) : "0"} />
              </Field>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Κατάσταση" htmlFor="status">
              <Select id="status" name="status" defaultValue={reservation?.status ?? "CONFIRMED"}>
                <option value="CONFIRMED">Επιβεβαιωμένη</option>
                <option value="PENDING">Εκκρεμεί</option>
                {editing && <option value="COMPLETED">Ολοκληρώθηκε</option>}
                {editing && <option value="CANCELLED">Ακυρώθηκε</option>}
              </Select>
            </Field>
            <Field label="9. Σημειώσεις" htmlFor="notes" className="sm:col-span-2">
              <Textarea id="notes" name="notes" defaultValue={reservation?.notes ?? ""} className="min-h-9" rows={1} />
            </Field>
          </div>
          <input type="hidden" name="currency" value={property?.currency ?? "EUR"} />

          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Ακύρωση</Button>
            <Button type="submit" loading={pending}>{editing ? "Αποθήκευση" : "10. Αποθήκευση κράτησης"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
