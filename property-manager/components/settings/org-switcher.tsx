"use client";

import { Select } from "@/components/ui/input";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";

export function OrgSwitcher({ current, organizations }: { current: string; organizations: { id: string; name: string }[] }) {
  const { run, pending } = useMutation();
  return (
    <Select
      aria-label="Active organization"
      value={current}
      disabled={pending}
      onChange={(e) => run(() => api("/api/organizations/active", { body: { organizationId: e.target.value } }), { success: "Switched organization" })}
    >
      {organizations.map((o) => (
        <option key={o.id} value={o.id}>{o.name}</option>
      ))}
    </Select>
  );
}
