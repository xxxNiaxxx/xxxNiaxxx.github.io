import type { Urgency } from '@/types/models';

const DAY_MS = 24 * 60 * 60 * 1000;

const MONTHS_GENITIVE = [
  'Ιανουαρίου', 'Φεβρουαρίου', 'Μαρτίου', 'Απριλίου', 'Μαΐου', 'Ιουνίου',
  'Ιουλίου', 'Αυγούστου', 'Σεπτεμβρίου', 'Οκτωβρίου', 'Νοεμβρίου', 'Δεκεμβρίου',
] as const;

const WEEKDAYS = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'] as const;

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** ISO string for a date `days` from today, at the given hour (local time). */
export function daysFromNow(days: number, hour = 9): string {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export function daysUntil(iso: string, now: Date = new Date()): number {
  return Math.round((startOfDay(new Date(iso)).getTime() - startOfDay(now).getTime()) / DAY_MS);
}

/** «10 Οκτωβρίου» */
export function formatDayMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]}`;
}

/** «10 Οκτωβρίου 2026» */
export function formatFullDate(iso: string): string {
  const d = new Date(iso);
  return `${formatDayMonth(iso)} ${d.getFullYear()}`;
}

/** «Πέμπτη, 10 Οκτωβρίου» */
export function formatWeekdayDate(iso: string): string {
  return `${WEEKDAYS[new Date(iso).getDay()]}, ${formatDayMonth(iso)}`;
}

/** Human relative label: «Σήμερα», «Αύριο», «Σε 5 ημέρες», «Έληξε πριν από 2 ημέρες». */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const days = daysUntil(iso, now);
  if (days === 0) return 'Σήμερα';
  if (days === 1) return 'Αύριο';
  if (days === -1) return 'Έληξε χθες';
  if (days < 0) return `Έληξε πριν από ${Math.abs(days)} ημέρες`;
  return `Σε ${days} ημέρες`;
}

export function getUrgency(dueDate: string | undefined, now: Date = new Date()): Urgency {
  if (!dueDate) return 'none';
  const days = daysUntil(dueDate, now);
  if (days < 0) return 'overdue';
  if (days <= 3) return 'high';
  if (days <= 10) return 'medium';
  return 'low';
}

export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 13) return 'Καλημέρα';
  if (hour >= 13 && hour < 21) return 'Καλησπέρα';
  return 'Καλό βράδυ';
}

/** Tomorrow at 09:00 local time. */
export function tomorrowMorning(now: Date = new Date()): Date {
  const d = startOfDay(now);
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}
