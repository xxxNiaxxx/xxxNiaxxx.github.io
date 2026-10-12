import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MonthGrid } from "@/components/calendar/month-grid";
import { CalendarLegend, Timeline } from "@/components/calendar/timeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterSelect } from "@/components/ui/filters";
import { EmptyState, LinkTabs, PageHeader } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { monthGrid } from "@/lib/calendar-grid";
import { addDaysISO, isISODate, monthRange, todayISO } from "@/lib/dates";
import { formatDay } from "@/lib/format";
import { getCalendar } from "@/lib/services/calendar";

export const metadata: Metadata = { title: "Ημερολόγιο" };

function startOfWeek(iso: string) {
  const dow = (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  return addDaysISO(iso, -dow);
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { ctx } = await getPageContext();
  const sp = await searchParams;
  const today = todayISO();
  // «Μήνας»: a classic month calendar (default) · «Ανά ακίνητο»: properties × days lines · «Εβδομάδα».
  const view = sp.view === "week" ? "week" : sp.view === "timeline" ? "timeline" : "month";
  const anchor = sp.date && isISODate(sp.date) ? sp.date : today;
  const grid = monthGrid(anchor);
  const range = view === "week" ? { from: startOfWeek(anchor), to: addDaysISO(startOfWeek(anchor), 7) } : monthRange(anchor);
  const prev = view === "week" ? addDaysISO(range.from, -7) : monthRange(addDaysISO(range.from, -1)).from;
  const next = range.to;
  // The month grid also shows the days of the neighbouring months that complete its weeks.
  const fetchRange = view === "month" ? { from: grid.from, to: grid.to } : range;
  const data = await getCalendar(ctx, { ...fetchRange, propertyId: sp.propertyId });
  const all = sp.propertyId ? await getCalendar(ctx, fetchRange) : data;

  const href = (updates: Record<string, string | undefined>) => {
    const q = new URLSearchParams(Object.entries({ ...sp, ...updates }).filter(([, v]) => v) as [string, string][]);
    return `/calendar?${q}`;
  };
  const title =
    view === "week"
      ? `${formatDay(range.from, { day: "numeric", month: "short" })} – ${formatDay(addDaysISO(range.to, -1), { day: "numeric", month: "short", year: "numeric" })}`
      : formatDay(range.from, { month: "long", year: "numeric" });

  return (
    <>
      <PageHeader title="Ημερολόγιο" description="Πατήστε σε κενή ημέρα για νέα κράτηση" />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon" aria-label="Προηγούμενο"><Link href={href({ date: prev })} scroll={false}><ChevronLeft /></Link></Button>
          <Button asChild variant="outline" size="icon" aria-label="Επόμενο"><Link href={href({ date: next })} scroll={false}><ChevronRight /></Link></Button>
          <Button asChild variant="outline"><Link href={href({ date: undefined })} scroll={false}>Σήμερα</Link></Button>
          <h2 className="ml-2 text-lg font-semibold tracking-tight">{title}</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <FilterSelect param="propertyId" label="Όλα τα ακίνητα" options={all.properties.map((p) => ({ value: p.id, label: p.name }))} />
          <LinkTabs
            active={view}
            tabs={[
              { key: "month", label: "Μήνας", href: href({ view: undefined }) },
              { key: "timeline", label: "Ανά ακίνητο", href: href({ view: "timeline" }) },
              { key: "week", label: "Εβδομάδα", href: href({ view: "week" }) },
            ]}
          />
        </div>
      </div>
      <Card className="overflow-hidden">
        {data.properties.length === 0 ? (
          <EmptyState title="Δεν υπάρχουν ακίνητα ακόμη" description="Προσθέστε ακίνητο για να γεμίσει το ημερολόγιο." action={<Button asChild><Link href="/properties">Μετάβαση στα ακίνητα</Link></Button>} />
        ) : (
          view === "month" ? (
            <MonthGrid data={data} weeks={grid.weeks} month={grid.month} today={today} propertyId={sp.propertyId} />
          ) : (
            <Timeline data={data} today={today} compact={view === "timeline"} />
          )
        )}
      </Card>
      <div className="mt-4">
        <CalendarLegend />
      </div>
    </>
  );
}
