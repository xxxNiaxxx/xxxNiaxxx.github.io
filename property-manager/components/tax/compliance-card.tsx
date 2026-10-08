"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import { COMPLIANCE_ITEMS } from "@/lib/tax/gr";
import { cn } from "@/lib/utils";

/** Safety & insurance checklist required for short-term rentals since 1.10.2025. */
export function ComplianceChecklist({ propertyId, compliance }: { propertyId: string; compliance: Record<string, boolean | string | null> }) {
  const [state, setState] = useState(compliance);
  const { run } = useMutation();
  const save = (patch: Record<string, boolean | string | null>) => {
    const previous = state;
    setState({ ...state, ...patch }); // optimistic; reverted if the save fails
    void run(() => api(`/api/properties/${propertyId}`, { method: "PATCH", body: { compliance: patch } }), { refresh: true }).then((r) => {
      if (r === undefined) setState(previous);
    });
  };
  const done = COMPLIANCE_ITEMS.filter((i) => state[i.key]).length;
  return (
    <div className="grid gap-3">
      <div className="text-xs text-muted-foreground">{done}/{COMPLIANCE_ITEMS.length} items in place</div>
      <ul className="grid gap-1">
        {COMPLIANCE_ITEMS.map((item) => (
          <li key={item.key}>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1 text-sm hover:bg-muted/60">
              <input type="checkbox" className="size-4 accent-[var(--color-accent)]" checked={Boolean(state[item.key])} onChange={(e) => save({ [item.key]: e.target.checked })} />
              <span className={cn(!state[item.key] && "text-muted-foreground")}>{item.label}</span>
            </label>
          </li>
        ))}
      </ul>
      <label className="grid gap-1.5 text-sm">
        <span className="text-[13px] font-medium">Liability insurance expires on</span>
        <Input type="date" defaultValue={typeof state.insuranceExpiresOn === "string" ? state.insuranceExpiresOn : ""} onChange={(e) => save({ insuranceExpiresOn: e.target.value || null })} className="w-48" />
      </label>
    </div>
  );
}
