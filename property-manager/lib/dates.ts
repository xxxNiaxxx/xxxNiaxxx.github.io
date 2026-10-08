/**
 * Date helpers. Reservation dates are calendar dates ("YYYY-MM-DD", stored as
 * UTC midnight in `@db.Date` columns); "today" is evaluated in APP_TIMEZONE.
 */
export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || "Europe/Athens";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export function isISODate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** "YYYY-MM-DD" → Date at UTC midnight (the value stored in a DATE column). */
export function isoToDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

/** DATE column value → "YYYY-MM-DD". */
export function dateToISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Calendar date of an instant in a time zone. */
export function zonedISODate(instant: Date, tz: string = APP_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function todayISO(now: Date = new Date(), tz: string = APP_TIMEZONE): string {
  return zonedISODate(now, tz);
}

export function addDaysISO(iso: string, days: number): string {
  return dateToISO(new Date(isoToDate(iso).getTime() + days * DAY_MS));
}

/** Whole days between two ISO dates (b − a). */
export function diffDaysISO(a: string, b: string): number {
  return Math.round((isoToDate(b).getTime() - isoToDate(a).getTime()) / DAY_MS);
}

function tzOffsetMs(instant: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUTC = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return asUTC - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The instant a wall-clock time occurs in a time zone. */
export function zonedDateTime(iso: string, time = "00:00", tz: string = APP_TIMEZONE): Date {
  const [h, m] = time.split(":").map(Number);
  const guess = new Date(isoToDate(iso).getTime() + (h * 60 + m) * 60_000);
  const first = new Date(guess.getTime() - tzOffsetMs(guess, tz));
  // Re-evaluate once in case the guess crossed a DST boundary.
  return new Date(guess.getTime() - tzOffsetMs(first, tz));
}

/** [start, end) instants of a calendar day in a time zone. */
export function zonedDayRange(iso: string, tz: string = APP_TIMEZONE): { start: Date; end: Date } {
  return { start: zonedDateTime(iso, "00:00", tz), end: zonedDateTime(addDaysISO(iso, 1), "00:00", tz) };
}

export function monthRange(iso: string): { from: string; to: string } {
  const [y, m] = iso.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { from, to: next };
}

/** Nights of [checkIn, checkOut) that fall inside [from, to). */
export function overlapNights(checkIn: string, checkOut: string, from: string, to: string): number {
  const start = checkIn > from ? checkIn : from;
  const end = checkOut < to ? checkOut : to;
  return Math.max(0, diffDaysISO(start, end));
}
