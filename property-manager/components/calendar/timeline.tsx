import Link from "next/link";
import { addDaysISO, diffDaysISO } from "@/lib/dates";
import { formatDay } from "@/lib/format";
import type { CalendarData } from "@/lib/services/calendar";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  CONFIRMED: "bg-accent text-white hover:bg-accent/90",
  COMPLETED: "bg-stone-400 text-white hover:bg-stone-500",
  PENDING: "bg-warning-soft text-warning ring-1 ring-inset ring-warning/40 hover:bg-amber-100",
};

const taskDot: Record<string, string> = {
  CLEANING: "bg-sky-500",
  MAINTENANCE: "bg-orange-500",
  CHECK_IN: "bg-emerald-500",
  CHECK_OUT: "bg-violet-500",
  INSPECTION: "bg-stone-500",
  OTHER: "bg-stone-400",
};

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-accent" /> Επιβεβαιωμένη</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-warning-soft ring-1 ring-warning/40" /> Εκκρεμεί</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-stone-400" /> Ολοκληρώθηκε</span>
      <span className="mx-1 h-3 w-px bg-border" />
      {Object.entries({ CLEANING: "Καθαρισμός", MAINTENANCE: "Συντήρηση", CHECK_IN: "Check-in", INSPECTION: "Επιθεώρηση" }).map(([k, l]) => (
        <span key={k} className="flex items-center gap-1.5"><span className={cn("size-2 rounded-full", taskDot[k])} /> {l}</span>
      ))}
    </div>
  );
}

/** Properties × days grid. Each stay is a block spanning the nights it occupies. */
export function Timeline({ data, today, compact }: { data: CalendarData; today: string; compact: boolean }) {
  const days = Array.from({ length: diffDaysISO(data.from, data.to) }, (_, i) => addDaysISO(data.from, i));
  const n = days.length;
  const cols = `repeat(${n}, minmax(${compact ? "38px" : "110px"}, 1fr))`;
  const tasksByCell = new Map<string, CalendarData["tasks"]>();
  for (const t of data.tasks) {
    if (!t.date) continue;
    const key = `${t.propertyId}:${t.date}`;
    tasksByCell.set(key, [...(tasksByCell.get(key) ?? []), t]);
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        {/* Header */}
        <div className="flex border-b border-border">
          <div className="sticky left-0 z-20 w-36 shrink-0 bg-surface px-4 py-2 text-xs font-medium text-muted-foreground sm:w-48">Ακίνητο</div>
          <div className="grid flex-1" style={{ gridTemplateColumns: cols }}>
            {days.map((d) => {
              const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
              return (
                <div key={d} className={cn("border-l border-border px-1 py-2 text-center", (dow === 0 || dow === 6) && "bg-muted/40", d === today && "bg-accent-soft")}>
                  <div className="text-[10px] font-medium text-muted-foreground uppercase">{formatDay(d, { weekday: compact ? "narrow" : "short" })}</div>
                  <div className={cn("text-sm font-semibold tabular-nums", d === today && "text-accent")}>{Number(d.slice(8))}</div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Rows */}
        {data.properties.map((p) => {
          const stays = data.reservations.filter((r) => r.propertyId === p.id);
          return (
            <div key={p.id} className="flex border-b border-border last:border-b-0">
              <Link href={`/properties/${p.id}`} className="sticky left-0 z-20 flex w-36 shrink-0 items-center bg-surface px-4 py-3 text-sm font-medium hover:text-accent sm:w-48">
                <span className="truncate">{p.name}</span>
                {p.status === "INACTIVE" && <span className="ml-2 text-[10px] text-muted-foreground">ανενεργό</span>}
              </Link>
              <div className="relative grid flex-1" style={{ gridTemplateColumns: cols }}>
                {days.map((d, i) => {
                  const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
                  const tasks = tasksByCell.get(`${p.id}:${d}`) ?? [];
                  return (
                    <Link
                      key={d}
                      href={p.status === "ACTIVE" ? `/reservations?new=1&propertyId=${p.id}&checkIn=${d}&checkOut=${addDaysISO(d, 1)}` : `/properties/${p.id}`}
                      title={p.status === "ACTIVE" ? `Νέα κράτηση · ${p.name} · ${formatDay(d)}` : undefined}
                      className={cn("group relative h-14 border-l border-border hover:bg-muted/70", (dow === 0 || dow === 6) && "bg-muted/30", d === today && "bg-accent-soft/60")}
                      style={{ gridColumn: i + 1, gridRow: 1 }}
                    >
                      {tasks.length > 0 && (
                        <span className="absolute bottom-1 left-1/2 z-20 flex -translate-x-1/2 gap-0.5" title={tasks.map((t) => t.title).join(", ")}>
                          {tasks.slice(0, 4).map((t) => (
                            <span key={t.id} className={cn("size-1.5 rounded-full ring-1 ring-white", taskDot[t.type], t.status === "COMPLETED" && "opacity-40")} />
                          ))}
                        </span>
                      )}
                    </Link>
                  );
                })}
                {stays.map((r) => {
                  const start = Math.max(0, diffDaysISO(data.from, r.checkIn));
                  const end = Math.min(n, diffDaysISO(data.from, r.checkOut));
                  if (end <= start) return null;
                  const clippedLeft = r.checkIn < data.from;
                  const clippedRight = r.checkOut > data.to;
                  return (
                    <Link
                      key={r.id}
                      href={`/reservations/${r.id}`}
                      title={`${r.guestName} · ${formatDay(r.checkIn)} → ${formatDay(r.checkOut)}`}
                      style={{ gridColumn: `${start + 1} / ${end + 1}`, gridRow: 1 }}
                      className={cn(
                        "z-10 mx-0.5 my-2.5 flex items-center overflow-hidden rounded-md px-2 text-xs font-medium whitespace-nowrap shadow-sm transition-colors",
                        statusStyles[r.status],
                        clippedLeft && "-ml-px rounded-l-none",
                        clippedRight && "-mr-px rounded-r-none",
                      )}
                    >
                      <span className="truncate">{r.guestName}</span>
                      {!compact && <span className="ml-1.5 truncate opacity-75">· {r.guestsCount} άτ.</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
