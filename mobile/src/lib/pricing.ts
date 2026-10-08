// Kept in sync with property-manager/lib/tax/gr.ts — only for the live preview in forms;
// the server recalculates everything when the reservation is saved.
import { addDays } from "./format";

const round2 = (n: number) => Math.round(n * 100) / 100;
const CLIMATE_FEE_BY_YEAR = [
  { from: 2024, high: [1.5, 10], low: [0.5, 4] },
  { from: 2025, high: [8, 15], low: [2, 4] },
];

/** ΤΑΚΚ of a stay [checkIn, checkOut): € per night by season; detached houses over 80 m² pay more. */
export function climateFeeForStay(checkIn: string, checkOut: string, property: { kind: string; areaSqm: number | null }) {
  const large = property.kind === "DETACHED_HOUSE" && (property.areaSqm ?? 0) > 80;
  let total = 0;
  for (let night = checkIn; night < checkOut; night = addDays(night, 1)) {
    const rates = CLIMATE_FEE_BY_YEAR.filter((r) => r.from <= Number(night.slice(0, 4))).at(-1);
    if (!rates) continue;
    const month = Number(night.slice(5, 7));
    const season = month >= 4 && month <= 10 ? rates.high : rates.low;
    total += large ? season[1] : season[0];
  }
  return round2(total);
}

/** Booking.com charges on the room price without the 0,5% presence fee (business regime). */
export function commissionFor(roomPrice: number, ratePercent: number, regime: string) {
  const presenceFee = regime === "BUSINESS" ? round2((roomPrice / (1.005 * 1.13)) * 0.005) : 0;
  return round2((round2(roomPrice - presenceFee) * ratePercent) / 100);
}
