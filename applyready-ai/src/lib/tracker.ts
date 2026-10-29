/**
 * The user's own list of applications, kept only in their browser
 * (localStorage): company, role, date sent and status. Nothing reaches our
 * server. It reminds them when a follow-up is due, and when they get an
 * interview it offers interview practice (the moment a need becomes a want).
 */
export const statuses = ["sent", "interview", "offer", "rejected"] as const;
export type Status = (typeof statuses)[number];

export type TrackedApplication = {
  id: string;
  company: string;
  role: string;
  sentOn: string; // YYYY-MM-DD
  status: Status;
};

const KEY = "applyready.applications";
export const FOLLOW_UP_DAYS = 7;
const MAX_ITEMS = 200;

export function today(now = new Date()): string {
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function daysSince(date: string, now = new Date()): number {
  const [y, m, d] = date.split("-").map(Number);
  const then = Date.UTC(y, m - 1, d);
  const [ty, tm, td] = today(now).split("-").map(Number);
  return Math.floor((Date.UTC(ty, tm - 1, td) - then) / 86_400_000);
}

export function followUpDue(app: TrackedApplication, now = new Date()): boolean {
  return app.status === "sent" && daysSince(app.sentOn, now) >= FOLLOW_UP_DAYS;
}

function valid(item: unknown): item is TrackedApplication {
  const a = item as TrackedApplication;
  return Boolean(a) && typeof a.id === "string" && typeof a.company === "string" && typeof a.role === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(a.sentOn) && (statuses as readonly string[]).includes(a.status);
}

export function parseApplications(raw: string | null): TrackedApplication[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    return Array.isArray(data) ? data.filter(valid).slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

export function loadApplications(): TrackedApplication[] {
  try { return parseApplications(window.localStorage.getItem(KEY)); } catch { return []; }
}

export function saveApplications(items: TrackedApplication[]): void {
  try { window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_ITEMS))); } catch { /* private mode */ }
}

export function newApplication(company: string, role: string, now = new Date()): TrackedApplication {
  return {
    id: `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    company: company.trim().slice(0, 120),
    role: role.trim().slice(0, 120),
    sentOn: today(now),
    status: "sent",
  };
}

/** Newest first, with due follow-ups at the top. */
export function sortApplications(items: TrackedApplication[], now = new Date()): TrackedApplication[] {
  return [...items].sort((a, b) => Number(followUpDue(b, now)) - Number(followUpDue(a, now)) || b.sentOn.localeCompare(a.sentOn));
}
