"use client";

import { Check, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import { formatDateTime } from "@/lib/format";
import type { FeedbackDTO } from "@/lib/services/feedback";
import { cn } from "@/lib/utils";

const TONES: Record<FeedbackDTO["kind"], BadgeTone> = { BUG: "danger", IDEA: "accent", OTHER: "neutral" };

export function FeedbackAdmin({ items }: { items: FeedbackDTO[] }) {
  const [showResolved, setShowResolved] = useState(false);
  const { run, pending } = useMutation();
  const shown = items.filter((f) => showResolved || !f.resolved);
  return (
    <div className="grid gap-4">
      <div className="flex gap-1.5">
        {[false, true].map((v) => (
          <button key={String(v)} onClick={() => setShowResolved(v)}
            className={cn("rounded-full px-3 py-1 text-[13px] font-medium ring-1 ring-border", showResolved === v ? "bg-primary text-primary-foreground ring-primary" : "bg-surface text-muted-foreground")}>
            {v ? `Όλα (${items.length})` : `Ανοιχτά (${items.filter((f) => !f.resolved).length})`}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <EmptyState title="Κανένα σχόλιο εδώ" description="Οι χρήστες στέλνουν σχόλια από το «Στείλτε σχόλιο» στο μενού." />
      ) : (
        <ul className="grid gap-3">
          {shown.map((f) => (
            <li key={f.id}>
              <Card className={f.resolved ? "opacity-60" : undefined}>
                <CardContent className="grid gap-2 py-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge tone={TONES[f.kind]}>{f.kindLabel}</Badge>
                    <span>{f.email}</span>
                    <span>· {formatDateTime(f.createdAt)}</span>
                    <span>· {f.client === "mobile" ? "κινητό" : "web"}{f.page ? ` ${f.page}` : ""}</span>
                  </div>
                  <p className="text-sm whitespace-pre-line">{f.message}</p>
                  <div>
                    <Button size="sm" variant={f.resolved ? "ghost" : "outline"} disabled={pending}
                      onClick={() => run(() => api(`/api/admin/feedback/${f.id}`, { method: "PATCH", body: { resolved: !f.resolved } }))}>
                      {f.resolved ? <><RotateCcw /> Ξανά ανοιχτό</> : <><Check /> Έγινε</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
