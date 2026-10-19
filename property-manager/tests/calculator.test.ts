import { describe, expect, it } from "vitest";
import { calculateNet } from "@/lib/tax/calculator";

const base = { year: 2026, largeHouse: false, highNights: 120, lowNights: 30, nightlyPrice: 80, airbnbPercent: 60, bookingPercent: 40, expenses: 2000, otherPropertyIncome: 0 };

describe("public net calculator", () => {
  it("splits a year into commissions, tax, expenses and net", () => {
    const r = calculateNet(base);
    expect(r.rent).toBe(12000);
    expect(r.climateFee).toBe(120 * 8 + 30 * 2);
    expect(r.airbnbCommission).toBe(1116); // 15,5% of 7.200
    expect(r.bookingCommission).toBeCloseTo(716.83 + 83.33, 1); // 15% of the room without the 0,5% fee + 1,6% payments
    expect(r.taxable).toBe(11400);
    expect(r.incomeTax).toBe(1710); // 15% up to 12.000
    expect(r.net).toBeCloseTo(12000 - r.commissions - 2000 - 1710, 2);
  });

  it("higher ΤΑΚΚ for a large house; direct stays pay no commission; other rents raise the rate", () => {
    expect(calculateNet({ ...base, largeHouse: true }).climateFee).toBe(120 * 15 + 30 * 4);
    expect(calculateNet({ ...base, airbnbPercent: 0, bookingPercent: 0 }).commissions).toBe(0);
    const withRents = calculateNet({ ...base, otherPropertyIncome: 20000 });
    expect(withRents.incomeTax).toBeGreaterThan(calculateNet(base).incomeTax);
  });

  it("keeps the inputs in range", () => {
    const r = calculateNet({ ...base, highNights: 999, lowNights: -5, airbnbPercent: 80, bookingPercent: 80 });
    expect(r.nights).toBe(214);
    expect(r.shares.airbnb + r.shares.booking).toBeCloseTo(1, 5);
    expect(r.shares.direct).toBeCloseTo(0, 5);
  });
});
