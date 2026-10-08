/**
 * Greek short-term rental (βραχυχρόνια μίσθωση) tax & compliance rules.
 *
 * Every amount, rate and deadline lives here so a law change is a one-file
 * update. Values were compiled on LAST_REVIEWED from AADE guidance and
 * secondary sources listed in docs/tax-greece.md — they are an aid, not tax
 * advice; users are told to confirm with their accountant.
 */
import { addDaysISO, diffDaysISO, monthRange } from "@/lib/dates";

export const LAST_REVIEWED = "2026-10-08";

// ─── Classification ──────────────────────────────────────────────────

/** Stays of this many nights or more are not short-term rentals (different AADE declaration). */
export const SHORT_TERM_MAX_NIGHTS_EXCLUSIVE = 60;

/** From this many properties with an AMA, an individual's activity is a business (ν. 5073/2023). */
export const BUSINESS_THRESHOLD_PROPERTIES = 3;

export type TaxRegime = "INDIVIDUAL" | "BUSINESS";

export function resolveRegime(setting: "AUTO" | TaxRegime, propertiesWithAma: number): TaxRegime {
  if (setting !== "AUTO") return setting;
  return propertiesWithAma >= BUSINESS_THRESHOLD_PROPERTIES ? "BUSINESS" : "INDIVIDUAL";
}

// ─── Climate resilience fee (Τέλος Ανθεκτικότητας στην Κλιματική Κρίση) ─

export type PropertyKind = "APARTMENT" | "DETACHED_HOUSE";

/** "YYYY-MM" of an ISO date. */
export function periodOf(isoDate: string) {
  return isoDate.slice(0, 7);
}

interface ClimateFeeRates {
  /** €/night, April–October */
  high: { standard: number; detachedOver80: number };
  /** €/night, November–March */
  low: { standard: number; detachedOver80: number };
}

/** Per property per night. ν. 5073/2023 (2024), ν. 5162/2024 & Α.1202/2024 (from 1.1.2025). */
const CLIMATE_FEE_BY_YEAR: { from: number; rates: ClimateFeeRates }[] = [
  { from: 2024, rates: { high: { standard: 1.5, detachedOver80: 10 }, low: { standard: 0.5, detachedOver80: 4 } } },
  { from: 2025, rates: { high: { standard: 8, detachedOver80: 15 }, low: { standard: 2, detachedOver80: 4 } } },
];

export const DETACHED_AREA_THRESHOLD_SQM = 80;

export function isHighSeason(isoDate: string) {
  const month = Number(isoDate.slice(5, 7));
  return month >= 4 && month <= 10;
}

function ratesFor(year: number): ClimateFeeRates | null {
  const applicable = CLIMATE_FEE_BY_YEAR.filter((r) => r.from <= year);
  return applicable.at(-1)?.rates ?? null;
}

export function climateFeePerNight(isoDate: string, property: { kind: PropertyKind; areaSqm: number | null }) {
  const rates = ratesFor(Number(isoDate.slice(0, 4)));
  if (!rates) return 0;
  const season = isHighSeason(isoDate) ? rates.high : rates.low;
  const large = property.kind === "DETACHED_HOUSE" && (property.areaSqm ?? 0) > DETACHED_AREA_THRESHOLD_SQM;
  return large ? season.detachedOver80 : season.standard;
}

/**
 * Fee for a stay [checkIn, checkOut), split by the calendar month of each night:
 * a stay that crosses into a new month is declared separately in each month's
 * return (e.g. 30 Oct → 2 Nov: two October nights in October, one in November).
 * Free stays (total 0) are exempt.
 */
export function climateFeeByMonth(
  stay: { checkIn: string; checkOut: string; totalAmount: number },
  property: { kind: PropertyKind; areaSqm: number | null },
): { period: string; nights: number; amount: number }[] {
  if (stay.totalAmount <= 0) return [];
  const months = new Map<string, { nights: number; amount: number }>();
  for (let i = 0; i < diffDaysISO(stay.checkIn, stay.checkOut); i++) {
    const night = addDaysISO(stay.checkIn, i);
    const m = months.get(periodOf(night)) ?? { nights: 0, amount: 0 };
    m.nights += 1;
    m.amount += climateFeePerNight(night, property);
    months.set(periodOf(night), m);
  }
  return [...months.entries()].map(([period, m]) => ({ period, nights: m.nights, amount: round2(m.amount) }));
}

/** Total fee for a stay. */
export function climateFeeForStay(
  stay: { checkIn: string; checkOut: string; totalAmount: number },
  property: { kind: PropertyKind; areaSqm: number | null },
) {
  return round2(climateFeeByMonth(stay, property).reduce((a, m) => a + m.amount, 0));
}

// ─── Deadlines ───────────────────────────────────────────────────────


function nextMonthFirst(isoDate: string) {
  return monthRange(isoDate).to;
}

/** Δήλωση Βραχυχρόνιας Διαμονής: by the 20th of the month after check-out (or after cancellation). */
export function stayDeclarationDeadline(departureOrCancellation: string) {
  return addDaysISO(nextMonthFirst(departureOrCancellation), 19);
}

/** Monthly climate-fee return (for the nights of that month): by the last day of the following month. */
export function climateFeeDeadline(period: string) {
  const following = nextMonthFirst(`${period}-01`);
  return addDaysISO(nextMonthFirst(following), -1);
}

/** Late stay declaration penalty (autonomous administrative fine). */
export const LATE_STAY_DECLARATION_FINE = 100;

// ─── Income tax (individuals, property income — Ε2) ─────────────────

export const FLAT_DEDUCTION_RATE = 0.05;

/** Rental income scale by income year (ν. 4172/2013 άρθρο 40 · ν. 5246/2025 from income year 2026). */
const RENTAL_SCALE_BY_YEAR: { from: number; brackets: { upTo: number; rate: number }[] }[] = [
  { from: 2014, brackets: [{ upTo: 12_000, rate: 0.15 }, { upTo: 35_000, rate: 0.35 }, { upTo: Infinity, rate: 0.45 }] },
  {
    from: 2026,
    brackets: [
      { upTo: 12_000, rate: 0.15 },
      { upTo: 24_000, rate: 0.25 },
      { upTo: 36_000, rate: 0.35 },
      { upTo: Infinity, rate: 0.45 },
    ],
  },
];

export function rentalScale(year: number) {
  return (RENTAL_SCALE_BY_YEAR.filter((s) => s.from <= year).at(-1) ?? RENTAL_SCALE_BY_YEAR[0]).brackets;
}

/** Progressive tax on `taxable`, given that `alreadyTaxed` of the scale is used by other property income. */
export function rentalIncomeTax(year: number, taxable: number, alreadyTaxed = 0) {
  const brackets = rentalScale(year);
  const tax = (amount: number) => {
    let remaining = Math.max(0, amount);
    let lower = 0;
    let total = 0;
    for (const b of brackets) {
      const slice = Math.min(remaining, b.upTo - lower);
      if (slice <= 0) break;
      total += slice * b.rate;
      remaining -= slice;
      lower = b.upTo;
    }
    return total;
  };
  return round2(tax(alreadyTaxed + taxable) - tax(alreadyTaxed));
}

// ─── Business regime (3+ properties) ─────────────────────────────────

export const VAT_RATE_ACCOMMODATION = 0.13;
/** Τέλος διαμονής παρεπιδημούντων, on the rent; included in the VAT base. */
export const PRESENCE_FEE_RATE = 0.005;

/**
 * Splits an all-in accommodation price (excluding the climate fee) into rent,
 * presence fee and VAT: total = rent × 1.005 × 1.13 (AADE example: 6.000 → 30 → 783,90).
 */
export function businessBreakdown(total: number) {
  const rent = total / ((1 + PRESENCE_FEE_RATE) * (1 + VAT_RATE_ACCOMMODATION));
  const presenceFee = rent * PRESENCE_FEE_RATE;
  const vat = (rent + presenceFee) * VAT_RATE_ACCOMMODATION;
  return { rent: round2(rent), presenceFee: round2(presenceFee), vat: round2(vat) };
}

// ─── Property compliance (Υπουργείο Τουρισμού, από 1.10.2025) ────────

export const COMPLIANCE_ITEMS = [
  { key: "fireExtinguisher", label: "Fire extinguisher (πυροσβεστήρας)" },
  { key: "smokeDetectors", label: "Smoke detectors (ανιχνευτές καπνού)" },
  { key: "firstAidKit", label: "First aid kit (φαρμακείο)" },
  { key: "emergencyLighting", label: "Emergency lighting & exit signs" },
  { key: "electricianDeclaration", label: "Electrician's declaration (υπεύθυνη δήλωση ηλεκτρολόγου)" },
  { key: "amaDisplayed", label: "AMA shown in every listing" },
] as const;
export type ComplianceKey = (typeof COMPLIANCE_ITEMS)[number]["key"];

export const SOURCES = [
  { label: "ΑΑΔΕ — Συχνές ερωτήσεις βραχυχρόνιας μίσθωσης (Σεπ. 2025)", url: "https://www.aade.gr/sites/default/files/2025-09/FAQs_braxixronias_misthosis1_0.pdf" },
  { label: "ΑΑΔΕ — Χρηστικός οδηγός μετά τον ν. 5073/2023", url: "https://www.aade.gr/sites/default/files/2024-09/odigos_vrachicronias_n.5073%202023_final_CLEAN.docx.pdf" },
  { label: "ΑΑΔΕ — FAQ Τέλους Ανθεκτικότητας (Ιαν. 2026)", url: "https://www.aade.gr/sites/default/files/2026-02/FAQs_el_telos_anthektikotitas_stin_klimatiki_krisi_02_02_2026.pdf" },
  { label: "Α.1202/2024 — ποσά ΤΑΚΚ από 1.1.2025", url: "https://www.taxheaven.gr/circulars/49201/a-1202-2024" },
  { label: "Κλίμακα ενοικίων από 2026 (ν. 5246/2025)", url: "https://taxrevenue.gr/forologia-enoikion-poso-foro-plirono/" },
];

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
