import { commissionFor, roomFromCommissionBase } from "@/lib/tax/gr";

/** What the amount column of an export means. */
export type AmountMode = "COMMISSIONABLE" | "GUEST_TOTAL" | "ROOM" | "PAYOUT";

export const AMOUNT_MODE_LABELS: Record<AmountMode, string> = {
  COMMISSIONABLE: "Ποσό προμήθειας του Booking — η «Τιμή» της εξαγωγής (τιμή δωματίου χωρίς το τέλος 0,5%)",
  GUEST_TOTAL: "Τι πλήρωσε ο επισκέπτης, με ΤΑΚΚ («Συνολική τιμή κράτησης»)",
  ROOM: "Τιμή δωματίου, χωρίς ΤΑΚΚ",
  PAYOUT: "Τι πληρώθηκα εγώ, μετά την προμήθεια (π.χ. «Earnings» Airbnb)",
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Room price and commission from an exported amount. `climateFee` is the ΤΑΚΚ
 * of the stay; `ratePercent` the platform's commission rate.
 */
export function roomAndCommission(
  mode: AmountMode,
  amount: number,
  args: { commission: number | null; climateFee: number; ratePercent: number; source: string },
) {
  if (amount <= 0) return { room: 0, commission: args.commission ?? 0 };
  if (mode === "PAYOUT") {
    if (args.commission !== null) return { room: round2(amount + args.commission), commission: args.commission };
    // payout = room − rate × base(room); base ≈ room without Booking's 0,5% fee
    const k = args.source === "BOOKING_COM" ? 1 - 0.005 / 1.135 : 1;
    const room = round2(amount / (1 - (args.ratePercent / 100) * k));
    return { room, commission: round2(room - amount) };
  }
  if (mode === "COMMISSIONABLE") {
    return { room: roomFromCommissionBase(amount, args.source), commission: args.commission ?? round2((amount * args.ratePercent) / 100) };
  }
  const room = mode === "GUEST_TOTAL" ? round2(Math.max(0, amount - args.climateFee)) : amount;
  return { room, commission: args.commission ?? commissionFor(room, args.ratePercent, args.source) };
}

/** Modes to try, in order of preference on ties, and the default without commission data. */
const PREFERENCE: Record<string, AmountMode[]> = {
  // Booking's export "Price" is the commissionable amount (real data: 209,10 with 31,37 commission).
  BOOKING_COM: ["COMMISSIONABLE", "GUEST_TOTAL", "ROOM", "PAYOUT"],
  AIRBNB: ["PAYOUT", "ROOM", "GUEST_TOTAL", "COMMISSIONABLE"],
  OTHER: ["GUEST_TOTAL", "ROOM", "PAYOUT", "COMMISSIONABLE"],
};

/**
 * When the export has commission amounts, the mode whose implied commission is
 * closest to them is the right one (e.g. Booking 209,10 with 31,37 → COMMISSIONABLE).
 */
export function detectAmountMode(
  rows: { amount: number; commission: number | null; commissionPercent: number | null; climateFee: number }[],
  args: { ratePercent: number; source: string },
): { mode: AmountMode; detected: boolean } {
  const modes = PREFERENCE[args.source] ?? PREFERENCE.OTHER;
  const sample = rows.filter((r) => r.amount > 0 && (r.commission ?? 0) > 0).slice(0, 50);
  if (!sample.length) return { mode: modes[0], detected: false };
  const error = (mode: AmountMode) =>
    sample.reduce((sum, r) => {
      const rate = r.commissionPercent ?? args.ratePercent;
      const { commission } = roomAndCommission(mode, r.amount, { commission: null, climateFee: r.climateFee, ratePercent: rate, source: args.source });
      return sum + Math.abs(commission - r.commission!) / r.commission!;
    }, 0);
  // Strictly better only, so ties keep the platform's usual meaning.
  const best = modes.reduce((a, b) => (error(b) < error(a) - 1e-9 ? b : a));
  return { mode: best, detected: true };
}
