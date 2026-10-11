"use client";

import { Globe, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, Stat } from "@/components/ui/misc";
import { formatDay } from "@/lib/format";
import type { ActivityDTO } from "@/lib/services/activity";
import { cn } from "@/lib/utils";

/** «πριν από 3 λεπτά», counted from the server's check time. */
function ago(iso: string, now: number) {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "τώρα";
  if (min < 60) return `πριν από ${min} λεπ.`;
  const h = Math.round(min / 60);
  if (h < 24) return `πριν από ${h} ${h === 1 ? "ώρα" : "ώρες"}`;
  const d = Math.round(h / 24);
  return `πριν από ${d} ${d === 1 ? "ημέρα" : "ημέρες"}`;
}

type Filter = "online" | "today" | "week" | "all";

export function ActivityAdmin({ data }: { data: ActivityDTO }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("today");
  const [showDemo, setShowDemo] = useState(false);

  // Live: reload the data every 30 seconds while the page is open and visible.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30_000);
    return () => clearInterval(id);
  }, [router]);

  const now = new Date(data.checkedAt).getTime();
  const within = (iso: string, ms: number) => now - new Date(iso).getTime() <= ms;
  const shown = data.items
    .filter((i) => showDemo || !i.demo)
    .filter((i) =>
      filter === "online" ? i.online : filter === "today" ? within(i.lastSeenAt, 86_400_000) : filter === "week" ? within(i.lastSeenAt, 7 * 86_400_000) : true,
    );
  const tabs: { key: Filter; label: string }[] = [
    { key: "online", label: `Τώρα (${data.online})` },
    { key: "today", label: `24 ώρες (${data.today})` },
    { key: "week", label: `7 ημέρες (${data.week})` },
    { key: "all", label: `30 ημέρες (${data.items.length})` },
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Συνδεδεμένοι τώρα" value={<span className="flex items-center gap-2">{data.online > 0 && <span className="size-2.5 animate-pulse rounded-full bg-success" />}{data.online}</span>} hint="τα τελευταία 5 λεπτά" />
        <Stat label="Τελευταίες 24 ώρες" value={data.today} />
        <Stat label="Τελευταίες 7 ημέρες" value={data.week} />
        <Stat label="Λογαριασμοί" value={data.totalUsers} hint={`${data.newThisWeek} νέοι αυτή την εβδομάδα`} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={cn("rounded-full px-3 py-1 text-[13px] font-medium ring-1 ring-border", filter === t.key ? "bg-primary text-primary-foreground ring-primary" : "bg-surface text-muted-foreground")}
          >
            {t.label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-[13px] text-muted-foreground">
          <input type="checkbox" className="size-4 accent-[var(--color-accent)]" checked={showDemo} onChange={(e) => setShowDemo(e.target.checked)} />
          Και ο λογαριασμός επίδειξης
        </label>
      </div>

      {shown.length === 0 ? (
        <Card><EmptyState title="Κανείς σε αυτό το διάστημα" description="Όταν κάποιος μπει στην εφαρμογή θα εμφανιστεί εδώ." /></Card>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {shown.map((u) => (
            <li key={u.id}>
              <Card>
                <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", u.online ? "bg-success" : "bg-muted-foreground/30")} aria-label={u.online ? "Συνδεδεμένος/η" : "Εκτός"} />
                    <div className="min-w-0">
                      <div className="font-medium">{u.name || u.email}</div>
                      <div className="truncate text-sm text-muted-foreground">{u.email}{u.organization ? ` · ${u.organization}` : ""}</div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
                        <span>{u.properties} {u.properties === 1 ? "ακίνητο" : "ακίνητα"}</span>
                        <span>{u.reservations} κρατήσεις</span>
                        <span>Μέλος από {formatDay(u.joinedAt.slice(0, 10), { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {u.demo && <Badge tone="neutral">Επίδειξη</Badge>}
                    <Badge tone={u.online ? "success" : "neutral"}>
                      {u.client === "app" ? <Smartphone className="size-3" /> : <Globe className="size-3" />}
                      {u.client === "app" ? "Εφαρμογή" : "Web"} · {u.online ? "online" : ago(u.lastSeenAt, now)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Καταγράφεται μόνο η ώρα της τελευταίας χρήσης και αν ήταν από το web ή την εφαρμογή, όχι τι έκανε ο χρήστης.
      </p>
    </div>
  );
}
