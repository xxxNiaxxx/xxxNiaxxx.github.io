"use client";

import { Check, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import { formatDateTime } from "@/lib/format";
import type { ErrorEventDTO } from "@/lib/monitoring/errors";
import { cn } from "@/lib/utils";

const SOURCES: Record<string, string> = { api: "API", page: "Σελίδα", cron: "Αυτόματες εργασίες" };

export function ErrorsAdmin({ items }: { items: ErrorEventDTO[] }) {
  const [showResolved, setShowResolved] = useState(false);
  const { run, pending } = useMutation();
  const shown = items.filter((e) => showResolved || !e.resolved);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex gap-1.5">
        {[false, true].map((v) => (
          <button key={String(v)} onClick={() => setShowResolved(v)}
            className={cn("rounded-full px-3 py-1 text-[13px] font-medium ring-1 ring-border", showResolved === v ? "bg-primary text-primary-foreground ring-primary" : "bg-surface text-muted-foreground")}>
            {v ? `Όλα (${items.length})` : `Ανοιχτά (${items.filter((e) => !e.resolved).length})`}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <EmptyState title="Κανένα σφάλμα" description="Όλα λειτουργούν κανονικά." />
      ) : (
        <ul className="grid gap-3">
          {shown.map((e) => (
            <li key={e.id}>
              <Card className={e.resolved ? "opacity-60" : undefined}>
                <CardContent className="grid gap-2 py-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge tone="danger">{SOURCES[e.source] ?? e.source}</Badge>
                    <span>{e.count} {e.count === 1 ? "φορά" : "φορές"}</span>
                    <span>· τελευταία {formatDateTime(e.lastSeenAt)}</span>
                    {e.path && <span className="break-all">· {e.path}</span>}
                  </div>
                  <p className="text-sm font-medium break-words">{e.message}</p>
                  {e.stack && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">Λεπτομέρειες</summary>
                      <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 whitespace-pre">{e.stack}</pre>
                    </details>
                  )}
                  <div>
                    <Button size="sm" variant={e.resolved ? "ghost" : "outline"} disabled={pending}
                      onClick={() => run(() => api(`/api/admin/errors/${e.id}`, { method: "PATCH", body: { resolved: !e.resolved } }))}>
                      {e.resolved ? <><RotateCcw /> Ξανά ανοιχτό</> : <><Check /> Λύθηκε</>}
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
