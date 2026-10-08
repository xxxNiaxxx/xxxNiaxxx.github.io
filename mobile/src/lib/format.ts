import { label } from "./labels";

export function formatMoney(amount: number, currency = "EUR") {
  try {
    return new Intl.NumberFormat("el-GR", { style: "currency", currency, maximumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount);
  } catch {
    return `${amount.toFixed(0)} ${currency === "EUR" ? "€" : currency}`;
  }
}

export const formatPercent = (rate: number) => `${Math.round(rate * 100)}%`;

const WEEKDAYS = ["Κυρ", "Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ"];
const MONTHS = ["Ιαν", "Φεβ", "Μαρ", "Απρ", "Μαΐ", "Ιουν", "Ιουλ", "Αυγ", "Σεπ", "Οκτ", "Νοε", "Δεκ"];

/** "Πέμ 8 Οκτ" for a YYYY-MM-DD calendar date (no time-zone shifts). */
export function formatDay(iso: string, withWeekday = true) {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${withWeekday ? `${WEEKDAYS[wd]} ` : ""}${d} ${MONTHS[m - 1]}`;
}

/** Local time "15:00" for an ISO timestamp. */
export function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${formatTime(iso)}`;
}

/** Greek label of an enum value. */
export function humanize(value: string) {
  return label(value);
}

export function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
