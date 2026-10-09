"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import { formatDateTime } from "@/lib/format";
import type { AdminOrganization } from "@/lib/services/billing";

const STATUS: Record<string, string> = { active: "Πληρώνει", trialing: "Συνδρομή από 1/1", past_due: "Αποτυχία πληρωμής", canceled: "Ακύρωσε", unpaid: "Απλήρωτη" };

export function OrganizationsAdmin({ items }: { items: AdminOrganization[] }) {
  const { run, pending } = useMutation();
  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-border">
        {items.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{o.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {o.owners.join(", ")} · {o.activeProperties} καταλύματα · {o.reservations} κρατήσεις · από {formatDateTime(o.createdAt, { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            {o.status && <Badge tone={o.status === "active" || o.status === "trialing" ? "success" : "warning"}>{STATUS[o.status] ?? o.status}{o.quantity ? ` · ${o.quantity}` : ""}</Badge>}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-[var(--color-accent)]" checked={o.billingExempt} disabled={pending}
                onChange={(e) => run(() => api(`/api/admin/organizations/${o.id}`, { method: "PATCH", body: { billingExempt: e.target.checked } }))} />
              Δωρεάν
            </label>
          </li>
        ))}
      </ul>
    </Card>
  );
}
