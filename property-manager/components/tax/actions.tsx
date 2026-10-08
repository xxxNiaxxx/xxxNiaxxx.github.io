"use client";

import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import { COMMISSION_SOURCES, SOURCE_LABELS } from "@/lib/reservation-sources";
import { useQueryParams } from "@/components/ui/filters";

export function DeclareButton({ reservationId, declared }: { reservationId: string; declared?: boolean }) {
  const { run, pending } = useMutation();
  return declared ? (
    <Button size="xs" variant="ghost" loading={pending} onClick={() => run(() => api(`/api/reservations/${reservationId}/declaration`, { body: { status: "PENDING" } }), { success: "Σημειώθηκε ως μη δηλωμένη" })}>
      <RotateCcw /> Αναίρεση
    </Button>
  ) : (
    <Button size="xs" variant="outline" loading={pending} onClick={() => run(() => api(`/api/reservations/${reservationId}/declaration`, { body: { status: "DECLARED" } }), { success: "Σημειώθηκε ως δηλωμένη στην ΑΑΔΕ" })}>
      <Check /> Το υπέβαλα
    </Button>
  );
}

export function NotRequiredButton({ reservationId }: { reservationId: string }) {
  const { run, pending } = useMutation();
  return (
    <Button size="xs" variant="ghost" loading={pending} onClick={() => run(() => api(`/api/reservations/${reservationId}/declaration`, { body: { status: "NOT_REQUIRED" } }), { success: "Σημειώθηκε ότι δεν απαιτείται" })}>
      Δεν απαιτείται
    </Button>
  );
}

export function FilingButton({ kind, period, amount, filed }: { kind: "CLIMATE_FEE" | "VAT" | "PRESENCE_FEE"; period: string; amount: number; filed: boolean }) {
  const { run, pending } = useMutation();
  return filed ? (
    <Button size="xs" variant="ghost" loading={pending} onClick={() => run(() => api(`/api/tax/filings?kind=${kind}&period=${period}`, { method: "DELETE" }), { success: "Η δήλωση αναιρέθηκε" })}>
      <RotateCcw /> Αναίρεση
    </Button>
  ) : (
    <Button size="xs" variant="outline" loading={pending} onClick={() => run(() => api("/api/tax/filings", { body: { kind, period, amount } }), { success: "Σημειώθηκε ως δηλωμένο" })}>
      <Check /> Το υπέβαλα
    </Button>
  );
}

export function RegimeSelect({ value, disabled }: { value: string; disabled?: boolean }) {
  const { run, pending } = useMutation();
  return (
    <Select
      aria-label="Φορολογικό καθεστώς"
      value={value}
      disabled={disabled || pending}
      className="w-auto"
      onChange={(e) => run(() => api("/api/tax/settings", { method: "PATCH", body: { taxRegime: e.target.value } }), { success: "Το καθεστώς ενημερώθηκε" })}
    >
      <option value="AUTO">Αυτόματα (με βάση το πλήθος ΑΜΑ)</option>
      <option value="INDIVIDUAL">Ιδιώτης — εισόδημα από ακίνητα (Ε2)</option>
      <option value="BUSINESS">Επιχείρηση — ΦΠΑ 13%</option>
    </Select>
  );
}

export function OtherIncomeInput({ value }: { value: number }) {
  const { set } = useQueryParams();
  return (
    <Input
      type="number"
      min={0}
      step="100"
      defaultValue={value || ""}
      placeholder="0"
      aria-label="Άλλα εισοδήματα από ακίνητα"
      className="w-36"
      onBlur={(e) => set({ otherIncome: e.target.value || null })}
      onKeyDown={(e) => e.key === "Enter" && set({ otherIncome: (e.target as HTMLInputElement).value || null })}
    />
  );
}

/** Commission % per platform and an optional own business tax rate. */
export function PricingSettings({ commissionRates, businessTaxRate, business, disabled }: { commissionRates: Record<string, number>; businessTaxRate: number | null; business: boolean; disabled?: boolean }) {
  const { run, pending } = useMutation();
  const save = (body: object) => run(() => api("/api/tax/settings", { method: "PATCH", body }), { success: "Αποθηκεύτηκε" });
  const field = (label: string, value: number | string, onSave: (v: string) => void, placeholder?: string) => (
    <label className="flex items-center gap-2 text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <Input type="number" min={0} max={60} step="0.5" defaultValue={value} placeholder={placeholder} disabled={disabled || pending} className="h-8 w-20"
        onBlur={(e) => e.target.value !== String(value) && onSave(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
      <span className="text-muted-foreground">%</span>
    </label>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <span className="w-full text-[13px] font-medium">Προμήθειες <span className="font-normal text-muted-foreground">(το ποσοστό του συμβολαίου σας με κάθε πλατφόρμα)</span></span>
      {COMMISSION_SOURCES.map((s) => (
        <span key={s}>{field(SOURCE_LABELS[s], commissionRates[s] ?? 0, (v) => save({ commissionRates: { [s]: Number(v) || 0 } }))}</span>
      ))}
      {business && field("Δικός σας συντελεστής φόρου", businessTaxRate ?? "", (v) => save({ businessTaxRate: v === "" ? null : Number(v) }), "κλίμακα")}
    </div>
  );
}
