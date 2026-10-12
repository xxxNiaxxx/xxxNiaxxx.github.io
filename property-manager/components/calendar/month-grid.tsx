import Link from "next/link";
import { weekSegments } from "@/lib/calendar-grid";
import { addDaysISO } from "@/lib/dates";
import { formatDay } from "@/lib/format";
import type { CalendarData } from "@/lib/services/calendar";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ", "Κυρ"];

const statusStyles: Record<string, string> = {
  CONFIRMED: "bg-accent text-white hover:bg-accent/90",
  COMPLETED: "bg-stone-400 text-white hover:bg-stone-500",
  PENDING: "bg-warning-soft text-warning ring-1 ring-inset ring-warning/40 hover:bg-amber-100",
};

/**
 * A classic month calendar: every day of the month at a glance, Monday to
 * Sunday, with each stay as a bar over the nights it occupies. Empty days
 * open a new reservation.
 */
export function MonthGrid({
  data,
  weeks,
  month,
  today,
  propertyId,
}: {
  data: CalendarData;
  weeks: string[][];
  month: { from: string; to: string };
  today: string;
  propertyId?: string;
}) {
  const multi = data.properties.length > 1;
  const names = new Map(data.properties.map((p) => [p.id, p.name]));
  const newHref = (d: string) => {
    const q = new URLSearchParams({ new: "1", checkIn: d, checkOut: addDaysISO(d, 1) });
    const only = propertyId ?? (data.properties.length === 1 ? data.properties[0].id : undefined);
    if (only) q.set("propertyId", only);
    return `/reservations?${q}`;
  };
  const tasksByDay = new Map<string, number>();
  for (const t of data.tasks) if (t.date) tasksByDay.set(t.date, (tasksByDay.get(t.date) ?? 0) + 1);

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={cn("py-2 text-center text-[11px] font-medium text-muted-foreground uppercase", i >= 5 && "bg-muted/40")}>{w}</div>
        ))}
      </div>
      {weeks.map((week) => {
        const segments = weekSegments(week[0], data.reservations);
        const lanes = Math.max(1, ...segments.map((s) => s.lane + 1));
        return (
          <div
            key={week[0]}
            className="grid grid-cols-7 border-b border-border last:border-b-0"
            style={{ gridTemplateRows: `auto repeat(${lanes}, minmax(22px, auto)) minmax(10px, 1fr)` }}
          >
            {/* Day cells: the background of the whole week row, each a link to a new reservation. */}
            {week.map((d, i) => (
              <Link
                key={d}
                href={newHref(d)}
                title={`Νέα κράτηση · ${formatDay(d)}`}
                aria-label={`Νέα κράτηση · ${formatDay(d)}`}
                className={cn(
                  "min-h-20 border-l border-border first:border-l-0 hover:bg-muted/60 sm:min-h-24",
                  i >= 5 && "bg-muted/30",
                  !(d >= month.from && d < month.to) && "bg-muted/50",
                  d === today && "bg-accent-soft/60",
                )}
                style={{ gridColumn: i + 1, gridRow: "1 / -1" }}
              />
            ))}
            {/* Day numbers, in their own row above the stays. */}
            {week.map((d, i) => {
              const inMonth = d >= month.from && d < month.to;
              const tasks = tasksByDay.get(d) ?? 0;
              return (
                <span key={`n-${d}`} className="pointer-events-none z-10 flex items-center justify-between px-1.5 pt-1 pb-0.5" style={{ gridColumn: i + 1, gridRow: 1 }}>
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center text-xs font-semibold tabular-nums sm:text-sm",
                      !inMonth && "text-muted-foreground/60",
                      d === today && "rounded-full bg-accent text-white",
                    )}
                  >
                    {Number(d.slice(8))}
                  </span>
                  {tasks > 0 && <span className="size-1.5 rounded-full bg-sky-500" title={`${tasks} ${tasks === 1 ? "εργασία" : "εργασίες"}`} />}
                </span>
              );
            })}
            {/* Stays: one bar per stay over its nights in this week. */}
            {segments.map((s) => {
              const r = s.stay;
              const label = multi ? `${r.guestName} · ${names.get(r.propertyId) ?? ""}` : r.guestName;
              return (
                <Link
                  key={r.id}
                  href={`/reservations/${r.id}`}
                  title={`${r.guestName} · ${names.get(r.propertyId) ?? ""} · ${formatDay(r.checkIn)} → ${formatDay(r.checkOut)}`}
                  style={{ gridColumn: `${s.start + 1} / ${s.end + 1}`, gridRow: s.lane + 2 }}
                  className={cn(
                    "relative z-10 mx-1 my-0.5 flex min-w-0 items-center overflow-hidden rounded-md px-1.5 text-[11px] leading-5 font-medium whitespace-nowrap shadow-sm transition-colors sm:text-xs",
                    statusStyles[r.status],
                    s.continuesLeft && "-ml-px rounded-l-none",
                    s.continuesRight && "-mr-px rounded-r-none",
                  )}
                >
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
