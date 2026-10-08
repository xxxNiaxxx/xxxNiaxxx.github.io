"use client";

import { Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import { useQueryParams } from "@/components/ui/filters";

export function DeclareButton({ reservationId, declared }: { reservationId: string; declared?: boolean }) {
  const { run, pending } = useMutation();
  return declared ? (
    <Button size="xs" variant="ghost" loading={pending} onClick={() => run(() => api(`/api/reservations/${reservationId}/declaration`, { body: { status: "PENDING" } }), { success: "Marked as not declared" })}>
      <RotateCcw /> Undo
    </Button>
  ) : (
    <Button size="xs" variant="outline" loading={pending} onClick={() => run(() => api(`/api/reservations/${reservationId}/declaration`, { body: { status: "DECLARED" } }), { success: "Marked as declared to AADE" })}>
      <Check /> Declared
    </Button>
  );
}

export function NotRequiredButton({ reservationId }: { reservationId: string }) {
  const { run, pending } = useMutation();
  return (
    <Button size="xs" variant="ghost" loading={pending} onClick={() => run(() => api(`/api/reservations/${reservationId}/declaration`, { body: { status: "NOT_REQUIRED" } }), { success: "Marked as not required" })}>
      Not required
    </Button>
  );
}

export function FilingButton({ kind, period, amount, filed }: { kind: "CLIMATE_FEE" | "VAT" | "PRESENCE_FEE"; period: string; amount: number; filed: boolean }) {
  const { run, pending } = useMutation();
  return filed ? (
    <Button size="xs" variant="ghost" loading={pending} onClick={() => run(() => api(`/api/tax/filings?kind=${kind}&period=${period}`, { method: "DELETE" }), { success: "Filing undone" })}>
      <RotateCcw /> Undo
    </Button>
  ) : (
    <Button size="xs" variant="outline" loading={pending} onClick={() => run(() => api("/api/tax/filings", { body: { kind, period, amount } }), { success: "Marked as filed" })}>
      <Check /> Filed
    </Button>
  );
}

export function RegimeSelect({ value, disabled }: { value: string; disabled?: boolean }) {
  const { run, pending } = useMutation();
  return (
    <Select
      aria-label="Tax regime"
      value={value}
      disabled={disabled || pending}
      className="w-auto"
      onChange={(e) => run(() => api("/api/tax/settings", { method: "PATCH", body: { taxRegime: e.target.value } }), { success: "Tax regime updated" })}
    >
      <option value="AUTO">Automatic (by number of AMAs)</option>
      <option value="INDIVIDUAL">Individual — property income (Ε2)</option>
      <option value="BUSINESS">Business — VAT 13%</option>
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
      aria-label="Other property income"
      className="w-36"
      onBlur={(e) => set({ otherIncome: e.target.value || null })}
      onKeyDown={(e) => e.key === "Enter" && set({ otherIncome: (e.target as HTMLInputElement).value || null })}
    />
  );
}
