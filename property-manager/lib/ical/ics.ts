/** Minimal iCalendar (RFC 5545) reader/writer for Airbnb / Booking.com availability calendars. */

export interface IcsEvent {
  uid: string;
  /** YYYY-MM-DD (first night) */
  start: string;
  /** YYYY-MM-DD (departure, exclusive) */
  end: string;
  summary: string;
  description: string;
}

const unescape = (v: string) => v.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
const escape = (v: string) => v.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

function toISODate(value: string): string | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function nextDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

export function parseIcs(text: string): IcsEvent[] {
  // Unfold continuation lines (CRLF followed by a space or tab).
  const lines = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r?\n/);
  const events: IcsEvent[] = [];
  let current: Record<string, string> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") current = {};
    else if (line === "END:VEVENT") {
      if (current) {
        const start = toISODate(current.DTSTART ?? "");
        let end = toISODate(current.DTEND ?? "");
        if (start && (!end || end <= start)) end = nextDay(start);
        if (start && end) {
          events.push({
            uid: current.UID || `${start}-${end}-${current.SUMMARY ?? ""}`,
            start,
            end,
            summary: unescape(current.SUMMARY ?? ""),
            description: unescape(current.DESCRIPTION ?? ""),
          });
        }
      }
      current = null;
    } else if (current) {
      const colon = line.indexOf(":");
      if (colon < 0) continue;
      const name = line.slice(0, colon).split(";")[0].toUpperCase();
      current[name] = line.slice(colon + 1);
    }
  }
  return events;
}

/** iCalendar with one all-day event per stay — what Airbnb/Booking import to block dates. */
export function buildIcs(calendarName: string, events: { uid: string; start: string; end: string; summary: string }[], now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ymd = (iso: string) => iso.replace(/-/g, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Brachychronia.ai//Calendar//EL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(calendarName)}`,
    ...events.flatMap((e) => [
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(e.start)}`,
      `DTEND;VALUE=DATE:${ymd(e.end)}`,
      `SUMMARY:${escape(e.summary)}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

/** Whether an event is a stay (vs. dates the host blocked) and its platform booking code, if any. */
export function classifyEvent(source: string, e: IcsEvent): { stay: boolean; code: string | null; phoneLast4: string | null } {
  // Airbnb: ".../hosting/reservations/details/HMABC12345"
  const code = e.description.match(/\/details\/([A-Z0-9]{6,})/i)?.[1] ?? e.description.match(/\b(HM[A-Z0-9]{6,})\b/)?.[1] ?? null;
  const phoneLast4 = e.description.match(/Last 4 Digits\)?:?\s*(\d{4})/i)?.[1] ?? null;
  if (source === "AIRBNB") return { stay: /reserved/i.test(e.summary) || !!code, code, phoneLast4 };
  // Booking.com marks every booked night "CLOSED - Not available" (bookings and closures look the same).
  if (source === "BOOKING_COM") return { stay: true, code, phoneLast4 };
  return { stay: !/not available|blocked|unavailable|μη διαθέσιμ/i.test(e.summary) || !!code, code, phoneLast4 };
}
