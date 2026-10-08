/**
 * Turns a reservations export (Booking.com Extranet, Airbnb, or any table) into
 * normalized rows. Pure functions — used in the browser before uploading.
 */

export const IMPORT_FIELDS = [
  "externalId",
  "guestName",
  "checkIn",
  "checkOut",
  "guests",
  "children",
  // Commission before amount so "Commission amount" is never taken for the price.
  "commission",
  "commissionPercent",
  "amount",
  "status",
  "listing",
  "phone",
  "email",
  "country",
  "notes",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
export type ColumnMapping = Partial<Record<ImportField, number>>;

export const FIELD_LABELS: Record<ImportField, string> = {
  externalId: "Αριθμός κράτησης",
  guestName: "Όνομα επισκέπτη",
  checkIn: "Άφιξη",
  checkOut: "Αναχώρηση",
  guests: "Άτομα / ενήλικες",
  children: "Παιδιά",
  amount: "Ποσό",
  commission: "Προμήθεια (€)",
  commissionPercent: "Προμήθεια (%)",
  status: "Κατάσταση",
  listing: "Δωμάτιο / καταχώριση",
  phone: "Τηλέφωνο",
  email: "Email",
  country: "Χώρα",
  notes: "Σχόλια",
};

export const REQUIRED_FIELDS: ImportField[] = ["guestName", "checkIn", "checkOut", "amount"];

/** Lower-case, no accents, only letters/digits/spaces. */
export function normalizeHeader(s: string) {
  return String(s)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}%#]+/gu, " ")
    .trim();
}

// Booking.com / Airbnb column names in English and Greek (normalized).
const SYNONYMS: Record<ImportField, string[]> = {
  externalId: ["book number", "booking number", "reservation number", "confirmation code", "αριθμος κρατησης", "κωδικος επιβεβαιωσης", "κωδικος κρατησης", "αριθμος επιβεβαιωσης"],
  guestName: ["guest name s", "guest names", "guest name", "guest", "ονομα επισκεπτη", "ονοματα επισκεπτων", "ονομα τα επισκεπτη ων", "επισκεπτης", "booked by", "κρατηση απο"],
  checkIn: ["check in", "arrival", "start date", "αφιξη", "ημερομηνια αφιξης", "ημερομηνια εναρξης", "check in date"],
  checkOut: ["check out", "departure", "end date", "αναχωρηση", "ημερομηνια αναχωρησης", "ημερομηνια ληξης", "check out date"],
  guests: ["people", "persons", "guests", "# of adults", "adults", "ατομα", "αριθμος ατομων", "ενηλικες", "# ενηλικων"],
  children: ["# of children", "children", "παιδια", "# παιδιων"],
  amount: ["price", "total price", "total payout", "earnings", "payout", "amount", "τιμη", "συνολικη τιμη", "κερδη", "αποδοχες", "ποσο", "εσοδα"],
  commission: ["commission amount", "ποσο προμηθειας", "προμηθεια", "service fee", "host fee", "χρεωση υπηρεσιας"],
  commissionPercent: ["commission %", "commission", "ποσοστο προμηθειας", "προμηθεια %"],
  status: ["status", "κατασταση"],
  listing: ["unit type", "listing", "room", "rooms", "property", "τυπος μοναδας", "καταχωριση", "δωματιο", "δωματια", "ακινητο", "καταλυμα"],
  phone: ["phone number", "phone", "contact", "τηλεφωνο", "αριθμος τηλεφωνου"],
  email: ["email", "e mail", "email address"],
  country: ["booker country", "country", "χωρα", "χωρα κρατησης", "χωρα πελατη"],
  notes: ["remarks", "special requests", "notes", "σχολια", "σημειωσεις", "ειδικα αιτηματα", "παρατηρησεις"],
};

/** Best guess of which column holds each field: exact names first, then partial matches. */
export function autoMap(headers: string[]): ColumnMapping {
  const norm = headers.map(normalizeHeader);
  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  for (const pass of ["exact", "contains"] as const) {
    for (const field of IMPORT_FIELDS) {
      if (mapping[field] !== undefined) continue;
      for (const syn of SYNONYMS[field]) {
        const target = normalizeHeader(syn);
        const idx = norm.findIndex((h, i) => !used.has(i) && (pass === "exact" ? h === target : h.includes(target) && target.length >= 4));
        if (idx >= 0) {
          mapping[field] = idx;
          used.add(idx);
          break;
        }
      }
    }
  }
  return mapping;
}

/** "425,53 EUR", "€ 1.234,56", "1,234.56", 425.53 → number (NaN when empty/invalid). */
export function parseAmount(value: unknown): number {
  if (typeof value === "number") return value;
  let s = String(value ?? "").replace(/[^\d,.-]/g, "");
  if (!s) return NaN;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    // The later separator is the decimal one.
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    // "1,234" (thousands) vs "425,53" (decimal)
    s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3}){2,}$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  ιαν: 1, φεβ: 2, μαρ: 3, απρ: 4, μαι: 5, μαΐ: 5, ιουν: 6, ιουλ: 7, αυγ: 8, σεπ: 9, οκτ: 10, νοε: 11, δεκ: 12,
};
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => {
  if (y < 100) y += 2000;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? `${y}-${pad(m)}-${pad(d)}` : null;
};

export type DateOrder = "DMY" | "MDY";

/** Day/month order of numeric dates like 11/10/2026: a part above 12 decides; otherwise the fallback. */
export function detectDateOrder(values: unknown[], fallback: DateOrder = "DMY"): DateOrder {
  for (const v of values) {
    const m = typeof v === "string" ? v.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/) : null;
    if (!m) continue;
    if (Number(m[1]) > 12) return "DMY";
    if (Number(m[2]) > 12) return "MDY";
  }
  return fallback;
}

/** Date cell → YYYY-MM-DD, or null. Accepts Date objects, ISO, numeric and month-name formats. */
export function parseDate(value: unknown, order: DateOrder): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return iso(value.getFullYear(), value.getMonth() + 1, value.getDate());
  const s = String(value ?? "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) return order === "DMY" ? iso(+m[3], +m[2], +m[1]) : iso(+m[3], +m[1], +m[2]);
  const words = normalizeHeader(s).split(" ");
  const monthIdx = words.findIndex((w) => MONTHS[w.slice(0, 3)] || MONTHS[w.slice(0, 4)]);
  if (monthIdx >= 0) {
    const month = MONTHS[words[monthIdx].slice(0, 4)] ?? MONTHS[words[monthIdx].slice(0, 3)];
    const nums = words.filter((w) => /^\d+$/.test(w)).map(Number);
    const year = nums.find((n) => n > 31);
    const day = nums.find((n) => n >= 1 && n <= 31);
    if (year && day) return iso(year, month, day);
  }
  return null;
}

export type ImportStatus = "CONFIRMED" | "PENDING" | "CANCELLED" | "COMPLETED";

/** Platform status text → reservation status. */
export function mapStatus(value: unknown, checkOut: string | null, today: string): ImportStatus {
  const s = normalizeHeader(String(value ?? ""));
  if (/cancel|ακυρ/.test(s)) return "CANCELLED";
  if (/pending|request|αιτημα|εκκρεμ/.test(s)) return "PENDING";
  return checkOut && checkOut <= today ? "COMPLETED" : "CONFIRMED";
}

export interface ImportRow {
  /** 1-based row number in the file, for messages. */
  line: number;
  externalId: string | null;
  guestName: string;
  checkIn: string | null;
  checkOut: string | null;
  guestsCount: number;
  amount: number;
  commission: number | null;
  commissionPercent: number | null;
  status: ImportStatus;
  listing: string;
  phone: string | null;
  email: string | null;
  country: string | null;
  notes: string | null;
  problems: string[];
}

/** Applies the mapping to the data rows (header row excluded). */
export function buildRows(rows: unknown[][], mapping: ColumnMapping, order: DateOrder, today: string): ImportRow[] {
  const cell = (r: unknown[], f: ImportField) => (mapping[f] === undefined ? "" : r[mapping[f]!]);
  const text = (r: unknown[], f: ImportField) => {
    const v = cell(r, f);
    const s = v instanceof Date ? "" : String(v ?? "").trim();
    return s || null;
  };
  return rows
    .map((r, i) => ({ r, line: i + 2 }))
    .filter(({ r }) => r.some((c) => String(c ?? "").trim() !== ""))
    .map(({ r, line }) => {
      const checkIn = parseDate(cell(r, "checkIn"), order);
      const checkOut = parseDate(cell(r, "checkOut"), order);
      const amount = parseAmount(cell(r, "amount"));
      const commission = mapping.commission === undefined ? NaN : parseAmount(cell(r, "commission"));
      const percent = mapping.commissionPercent === undefined ? NaN : parseAmount(cell(r, "commissionPercent"));
      const adults = parseAmount(cell(r, "guests"));
      const children = mapping.children === undefined ? 0 : parseAmount(cell(r, "children")) || 0;
      const problems: string[] = [];
      const guestName = text(r, "guestName") ?? "";
      if (!guestName) problems.push("Λείπει το όνομα επισκέπτη");
      if (!checkIn) problems.push("Μη έγκυρη ημερομηνία άφιξης");
      if (!checkOut) problems.push("Μη έγκυρη ημερομηνία αναχώρησης");
      if (checkIn && checkOut && checkOut <= checkIn) problems.push("Η αναχώρηση είναι πριν την άφιξη");
      if (!Number.isFinite(amount)) problems.push("Μη έγκυρο ποσό");
      const status = mapStatus(cell(r, "status"), checkOut, today);
      return {
        line,
        externalId: text(r, "externalId"),
        guestName,
        checkIn,
        checkOut,
        guestsCount: Math.max(1, Math.round((Number.isFinite(adults) ? adults : 1) + children)),
        amount: Number.isFinite(amount) ? Math.abs(amount) : 0,
        commission: Number.isFinite(commission) ? Math.abs(commission) : null,
        commissionPercent: Number.isFinite(percent) && percent > 0 && percent < 100 ? percent : null,
        status,
        listing: text(r, "listing") ?? "",
        phone: text(r, "phone"),
        email: text(r, "email")?.includes("@") ? text(r, "email") : null,
        country: text(r, "country"),
        notes: text(r, "notes"),
        problems,
      };
    });
}
