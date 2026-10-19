import {
  climateFeePerNight,
  commissionFor,
  DEFAULT_COMMISSION_RATES,
  DEFAULT_PAYMENT_FEE_RATES,
  FLAT_DEDUCTION_RATE,
  rentalIncomeTax,
} from "./gr";

/**
 * The public «Υπολογιστής καθαρών» (no sign-up): a year's estimate for one
 * property of an individual (Ε2), from nights, average price and the platform
 * mix. Same rules as the app (lib/tax/gr.ts), on yearly totals instead of
 * real stays.
 */
export interface CalculatorInput {
  year: number;
  /** A detached house over 80 m² pays the higher ΤΑΚΚ. */
  largeHouse: boolean;
  /** Booked nights April–October and November–March. */
  highNights: number;
  lowNights: number;
  /** Average room price per night (what the guest pays, without ΤΑΚΚ). */
  nightlyPrice: number;
  /** Share of nights through Airbnb and Booking.com (%); the rest is direct. */
  airbnbPercent: number;
  bookingPercent: number;
  /** Cleaning, utilities, supplies… for the year. */
  expenses: number;
  /** Other property income of the same person (long-term rents), taxed on the same scale first. */
  otherPropertyIncome: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : 0));

export function calculateNet(raw: CalculatorInput) {
  const highNights = clamp(raw.highNights, 0, 214);
  const lowNights = clamp(raw.lowNights, 0, 151);
  const price = clamp(raw.nightlyPrice, 0, 100_000);
  const airbnb = clamp(raw.airbnbPercent, 0, 100) / 100;
  const booking = Math.min(clamp(raw.bookingPercent, 0, 100) / 100, 1 - airbnb);
  const direct = 1 - airbnb - booking;
  const nights = highNights + lowNights;
  const rent = r2(nights * price);

  const property = { kind: raw.largeHouse ? ("DETACHED_HOUSE" as const) : ("APARTMENT" as const), areaSqm: raw.largeHouse ? 81 : null };
  const takkHigh = climateFeePerNight(`${raw.year}-07-01`, property);
  const takkLow = climateFeePerNight(`${raw.year}-01-15`, property);
  const climateFee = r2(highNights * takkHigh + lowNights * takkLow);

  const airbnbCommission = commissionFor(rent * airbnb, DEFAULT_COMMISSION_RATES.AIRBNB, "AIRBNB");
  // Booking: commission on the room price without its 0,5% fee, plus the payment charge on what the guest pays.
  const bookingCommission = r2(
    commissionFor(rent * booking, DEFAULT_COMMISSION_RATES.BOOKING_COM, "BOOKING_COM") +
      ((rent + climateFee) * booking * DEFAULT_PAYMENT_FEE_RATES.BOOKING_COM) / 100,
  );
  const commissions = r2(airbnbCommission + bookingCommission);

  // Individuals: tax on the gross rent less a flat 5%; commissions and expenses are not deducted.
  const taxable = r2(rent * (1 - FLAT_DEDUCTION_RATE));
  const incomeTax = rentalIncomeTax(raw.year, taxable, clamp(raw.otherPropertyIncome, 0, 10_000_000) * (1 - FLAT_DEDUCTION_RATE));
  const expenses = clamp(raw.expenses, 0, 10_000_000);
  const net = r2(rent - commissions - expenses - incomeTax);

  return {
    nights,
    rent,
    shares: { airbnb, booking, direct },
    airbnbCommission,
    bookingCommission,
    commissions,
    expenses,
    taxable,
    incomeTax,
    /** Income tax as a share of the rent. */
    effectiveTaxRate: rent > 0 ? incomeTax / rent : 0,
    net,
    netPerNight: nights > 0 ? r2(net / nights) : 0,
    /** Paid by the guest and passed on to AADE: not income, not a cost. */
    climateFee,
    takkHigh,
    takkLow,
  };
}
export type CalculatorResult = ReturnType<typeof calculateNet>;
