import { addDaysISO, diffDaysISO, monthRange } from "@/lib/dates";

/** Monday of the week of a date (ISO, UTC). */
export function weekStart(iso: string) {
  const dow = (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  return addDaysISO(iso, -dow);
}

/** Whole weeks (Monday–Sunday) covering the month of `iso`, for a month grid. */
export function monthGrid(iso: string) {
  const month = monthRange(iso);
  const from = weekStart(month.from);
  const to = addDaysISO(weekStart(addDaysISO(month.to, -1)), 7);
  const weeks: string[][] = [];
  for (let d = from; d < to; d = addDaysISO(d, 7)) weeks.push(Array.from({ length: 7 }, (_, i) => addDaysISO(d, i)));
  return { month, from, to, weeks };
}

export interface StaySegment<T> {
  stay: T;
  /** Columns 0–6 of the week; `end` is exclusive. */
  start: number;
  end: number;
  /** Row inside the week, so overlapping stays don't cover each other. */
  lane: number;
  /** The stay began before / goes on after this week. */
  continuesLeft: boolean;
  continuesRight: boolean;
}

/**
 * The part of each stay that falls in one week, one bar per stay over the
 * nights it occupies (check-in to the night before check-out), placed in the
 * first free lane.
 */
export function weekSegments<T extends { checkIn: string; checkOut: string }>(weekFrom: string, stays: T[]): StaySegment<T>[] {
  const weekTo = addDaysISO(weekFrom, 7);
  const lanes: number[] = []; // per lane, the first free column
  return stays
    .filter((s) => s.checkIn < weekTo && s.checkOut > weekFrom)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn) || b.checkOut.localeCompare(a.checkOut))
    .map((stay) => {
      const start = Math.max(0, diffDaysISO(weekFrom, stay.checkIn));
      const end = Math.min(7, diffDaysISO(weekFrom, stay.checkOut));
      let lane = lanes.findIndex((free) => free <= start);
      if (lane === -1) lane = lanes.length;
      lanes[lane] = end;
      return { stay, start, end, lane, continuesLeft: stay.checkIn < weekFrom, continuesRight: stay.checkOut > weekTo };
    });
}
