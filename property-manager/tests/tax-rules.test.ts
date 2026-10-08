import { describe, expect, it } from "vitest";
import {
  businessBreakdown,
  climateFeeDeadline,
  climateFeeForStay,
  climateFeePerNight,
  rentalIncomeTax,
  resolveRegime,
  stayDeclarationDeadline,
} from "@/lib/tax/gr";

const apartment = { kind: "APARTMENT" as const, areaSqm: 70 };
const bigHouse = { kind: "DETACHED_HOUSE" as const, areaSqm: 150 };
const smallHouse = { kind: "DETACHED_HOUSE" as const, areaSqm: 80 };

describe("climate resilience fee (ΤΑΚΚ)", () => {
  it("uses 2025+ amounts by season and property type", () => {
    expect(climateFeePerNight("2026-07-10", apartment)).toBe(8);
    expect(climateFeePerNight("2026-01-10", apartment)).toBe(2);
    expect(climateFeePerNight("2026-07-10", bigHouse)).toBe(15);
    expect(climateFeePerNight("2026-12-10", bigHouse)).toBe(4);
    // Exactly 80 m² is not "over 80".
    expect(climateFeePerNight("2026-07-10", smallHouse)).toBe(8);
  });

  it("uses 2024 amounts for 2024 nights and nothing before", () => {
    expect(climateFeePerNight("2024-08-01", apartment)).toBe(1.5);
    expect(climateFeePerNight("2024-02-01", bigHouse)).toBe(4);
    expect(climateFeePerNight("2023-08-01", apartment)).toBe(0);
  });

  it("charges each night at its own season, across the October/November boundary", () => {
    // Nights of 30 and 31 October (8 €) + 1 November (2 €)
    expect(climateFeeForStay({ checkIn: "2026-10-30", checkOut: "2026-11-02", totalAmount: 300 }, apartment)).toBe(18);
    // AADE example: 10 nights in July in an apartment = 80 €
    expect(climateFeeForStay({ checkIn: "2026-07-01", checkOut: "2026-07-11", totalAmount: 900 }, apartment)).toBe(80);
  });

  it("exempts free stays", () => {
    expect(climateFeeForStay({ checkIn: "2026-07-01", checkOut: "2026-07-05", totalAmount: 0 }, apartment)).toBe(0);
  });
});

describe("deadlines", () => {
  it("stay declaration: 20th of the month after departure", () => {
    expect(stayDeclarationDeadline("2026-07-02")).toBe("2026-08-20");
    expect(stayDeclarationDeadline("2026-12-31")).toBe("2027-01-20");
  });

  it("climate fee return: last day of the following month", () => {
    expect(climateFeeDeadline("2026-06")).toBe("2026-07-31");
    expect(climateFeeDeadline("2026-01")).toBe("2026-02-28");
    expect(climateFeeDeadline("2026-12")).toBe("2027-01-31");
  });
});

describe("regime", () => {
  it("becomes a business from the 3rd property with an AMA unless overridden", () => {
    expect(resolveRegime("AUTO", 2)).toBe("INDIVIDUAL");
    expect(resolveRegime("AUTO", 3)).toBe("BUSINESS");
    expect(resolveRegime("INDIVIDUAL", 5)).toBe("INDIVIDUAL");
    expect(resolveRegime("BUSINESS", 1)).toBe("BUSINESS");
  });

  it("splits a business price like the AADE example (rent 6.000 → fee 30 → VAT 783,90)", () => {
    expect(businessBreakdown(6813.9)).toEqual({ rent: 6000, presenceFee: 30, vat: 783.9 });
  });
});

describe("rental income tax scale", () => {
  it("income year 2025: 15% / 35% / 45%", () => {
    expect(rentalIncomeTax(2025, 12_000)).toBe(1800);
    expect(rentalIncomeTax(2025, 20_000)).toBe(1800 + 8000 * 0.35);
    expect(rentalIncomeTax(2025, 40_000)).toBe(1800 + 23_000 * 0.35 + 5000 * 0.45);
  });

  it("income year 2026: new 25% bracket (ν. 5246/2025)", () => {
    expect(rentalIncomeTax(2026, 20_000)).toBe(1800 + 8000 * 0.25);
    expect(rentalIncomeTax(2026, 40_000)).toBe(1800 + 3000 + 12_000 * 0.35 + 4000 * 0.45);
  });

  it("taxes the marginal slice when there is other property income", () => {
    // 10.000 of other rent already uses the 15% band: 2.000 at 15% + 8.000 at 25%
    expect(rentalIncomeTax(2026, 10_000, 10_000)).toBe(300 + 2000);
  });
});
