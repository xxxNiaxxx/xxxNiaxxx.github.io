import { commissionFor, type TaxRegime } from "@/lib/tax/gr";

/** What the amount column of an export means. */
export type AmountMode = "GUEST_TOTAL" | "ROOM" | "PAYOUT";

export const AMOUNT_MODE_LABELS: Record<AmountMode, string> = {
  GUEST_TOTAL: "Τι πλήρωσε ο επισκέπτης, με ΤΑΚΚ (π.χ. «Συνολική τιμή κράτησης» Booking)",
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
  args: { commission: number | null; climateFee: number; ratePercent: number; regime: TaxRegime },
) {
  if (amount <= 0) return { room: 0, commission: args.commission ?? 0 };
  if (mode === "PAYOUT") {
    if (args.commission !== null) return { room: round2(amount + args.commission), commission: args.commission };
    // payout = room − rate × base, base = room (individual) or room without the 0,5% fee (business)
    const k = args.regime === "BUSINESS" ? 1 - 0.005 / (1.005 * 1.13) : 1;
    const room = round2(amount / (1 - (args.ratePercent / 100) * k));
    return { room, commission: round2(room - amount) };
  }
  const room = mode === "GUEST_TOTAL" ? round2(Math.max(0, amount - args.climateFee)) : amount;
  return { room, commission: args.commission ?? commissionFor(room, args.ratePercent, args.regime) };
}

/**
 * When the export has commission amounts, the mode whose implied commission is
 * closest to them is the right one (e.g. Booking: 425,53 with 55,19 → GUEST_TOTAL).
 */
export function detectAmountMode(
  rows: { amount: number; commission: number | null; commissionPercent: number | null; climateFee: number }[],
  args: { ratePercent: number; regime: TaxRegime; fallback: AmountMode },
): { mode: AmountMode; detected: boolean } {
  const sample = rows.filter((r) => r.amount > 0 && (r.commission ?? 0) > 0).slice(0, 50);
  if (!sample.length) return { mode: args.fallback, detected: false };
  const error = (mode: AmountMode) =>
    sample.reduce((sum, r) => {
      const rate = r.commissionPercent ?? args.ratePercent;
      const { commission } = roomAndCommission(mode, r.amount, { commission: null, climateFee: r.climateFee, ratePercent: rate, regime: args.regime });
      return sum + Math.abs(commission - r.commission!) / r.commission!;
    }, 0);
  const modes: AmountMode[] = ["GUEST_TOTAL", "ROOM", "PAYOUT"];
  const best = modes.reduce((a, b) => (error(b) < error(a) ? b : a));
  return { mode: best, detected: true };
}
