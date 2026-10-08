import { APP_TIMEZONE } from "@/lib/dates";

export function formatMoney(amount: number, currency = "EUR", opts: { compact?: boolean } = {}) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    maximumFractionDigits: opts.compact || Number.isInteger(amount) ? 0 : 2,
    notation: opts.compact && Math.abs(amount) >= 10_000 ? "compact" : "standard",
  }).format(amount);
}

export function formatPercent(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

/** "Mon 12 Oct" for a YYYY-MM-DD calendar date. */
export function formatDay(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) {
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

export function formatDateTime(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) {
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: APP_TIMEZONE }).format(new Date(iso));
}

export function formatTime(iso: string) {
  return formatDateTime(iso, { hour: "2-digit", minute: "2-digit" });
}

export function humanize(value: string) {
  const s = value.toLowerCase().replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
