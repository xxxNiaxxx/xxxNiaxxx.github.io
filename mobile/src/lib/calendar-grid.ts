import { addDays } from "@/lib/format";

/** Same layout rules as the web month calendar (property-manager/lib/calendar-grid.ts). */

const diffDays = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

export function monthStart(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

export function addMonths(monthFrom: string, n: number) {
  const [y, m] = monthFrom.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}

/** Monday of the week of a date. */
export function weekStart(iso: string) {
  const dow = (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(iso, -dow);
}

/** Whole Monday–Sunday weeks covering the month that starts at `monthFrom`. */
export function monthGrid(monthFrom: string) {
  const monthTo = addMonths(monthFrom, 1);
  const from = weekStart(monthFrom);
  const to = addDays(weekStart(addDays(monthTo, -1)), 7);
  const weeks: string[][] = [];
  for (let d = from; d < to; d = addDays(d, 7)) weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
  return { monthFrom, monthTo, from, to, weeks };
}

/** Each stay's nights within one week, as columns 0–6 (end exclusive), in non-overlapping lanes. */
export function weekSegments<T extends { checkIn: string; checkOut: string }>(weekFrom: string, stays: T[]) {
  const weekTo = addDays(weekFrom, 7);
  const lanes: number[] = [];
  return stays
    .filter((s) => s.checkIn < weekTo && s.checkOut > weekFrom)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn) || b.checkOut.localeCompare(a.checkOut))
    .map((stay) => {
      const start = Math.max(0, diffDays(weekFrom, stay.checkIn));
      const end = Math.min(7, diffDays(weekFrom, stay.checkOut));
      let lane = lanes.findIndex((free) => free <= start);
      if (lane === -1) lane = lanes.length;
      lanes[lane] = end;
      return { stay, start, end, lane, continuesLeft: stay.checkIn < weekFrom, continuesRight: stay.checkOut > weekTo };
    });
}
