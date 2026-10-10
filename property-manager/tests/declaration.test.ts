import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import type { OrgContext } from "@/lib/permissions";
import { updateGuest } from "@/lib/services/guests";
import { cancelReservation, createReservation, updateReservation } from "@/lib/services/reservations";
import { getStayTax, updateTaxSettings } from "@/lib/services/tax";
import { createGuest, createTenant, resetDatabase } from "./helpers";

const NOW = new Date("2026-12-01T09:00:00Z");
const value = (form: { fields: { key: string; value: string | null }[] }, key: string) => form.fields.find((f) => f.key === key)?.value;
const keys = (form: { fields: { key: string }[] }) => form.fields.map((f) => f.key);

describe("AADE stay declaration form", () => {
  let ctx: OrgContext;
  let propertyId: string;
  let guestId: string;

  beforeAll(async () => {
    await resetDatabase();
    ctx = await createTenant("Decl");
    propertyId = (await db.property.create({
      data: { organizationId: ctx.organizationId, name: "Zenios", city: "Αθήνα", country: "Ελλάδα", basePrice: 60, maxGuests: 2, ama: "00001234567", kind: "APARTMENT" },
    })).id;
    guestId = (await createGuest(ctx, "Rogerio", "Silva")).id;
  });

  it("lists what is missing until the guest's identity is filled in", async () => {
    // Hosthub demo: 250,09 € with 8 € ΤΑΚΚ (4 nights in November), business regime → 213,17 € declared.
    await updateTaxSettings(ctx, { taxRegime: "BUSINESS" });
    const r = await createReservation(ctx, { propertyId, guestId, guestsCount: 1, checkIn: "2026-11-19", checkOut: "2026-11-23", totalAmount: 242.09, source: "AIRBNB", confirmationCode: "HM2FJKFQHC" });
    let tax = await getStayTax(ctx, r.id, NOW);
    // A guest without a Greek country or ΑΦΜ is declared as a foreigner, in the AADE form's order.
    expect(keys(tax.declarationForm)).toEqual(["ama", "checkIn", "checkOut", "amount", "paymentMethod", "platform", "foreigner", "guestName", "idNumber", "bookingNumber"]);
    expect(tax.declarationForm.missing).toEqual(["Αρ. Διαβατηρίου / Ταυτότητα Ε.Ε."]);
    expect(value(tax.declarationForm, "foreigner")).toBe("Ναι");
    expect(value(tax.declarationForm, "platform")).toBe("Airbnb");
    expect(value(tax.declarationForm, "bookingNumber")).toBe("HM2FJKFQHC");
    expect(value(tax.declarationForm, "amount")).toBe("213,17");
    expect(value(tax.declarationForm, "checkIn")).toBe("19/11/2026");
    expect(value(tax.declarationForm, "paymentMethod")).toBe("Λογαριασμός Πληρωμών Ημεδαπής");
    expect(tax.declarationForm.paymentMethodIsDefault).toBe(true);

    await updateGuest(ctx, guestId, { idNumber: "YB1234567" });
    await updateReservation(ctx, r.id, { paymentMethod: "CARD" });
    tax = await getStayTax(ctx, r.id, NOW);
    expect(tax.declarationForm.missing).toEqual([]);
    expect(value(tax.declarationForm, "idNumber")).toBe("YB1234567");
    // AADE has no card option: card (POS) payments are declared as a Greek payment account.
    expect(value(tax.declarationForm, "paymentMethod")).toBe("Λογαριασμός Πληρωμών Ημεδαπής");
  });

  it("individuals declare the whole room price; direct stays need a payment method", async () => {
    await updateTaxSettings(ctx, { taxRegime: "INDIVIDUAL" });
    const r = await createReservation(ctx, { propertyId, guestId, guestsCount: 1, checkIn: "2026-10-01", checkOut: "2026-10-03", totalAmount: 210.03, source: "DIRECT" });
    const tax = await getStayTax(ctx, r.id, NOW);
    expect(value(tax.declarationForm, "amount")).toBe("210,03");
    // A direct stay has no platform or booking number: neither is counted as missing.
    expect(value(tax.declarationForm, "platform")).toBeNull();
    expect(value(tax.declarationForm, "bookingNumber")).toBeNull();
    expect(tax.declarationForm.missing).toEqual(["Τρόπος πληρωμής μισθώματος"]);
  });

  it("Greek tenants are declared by ΑΦΜ, without passport", async () => {
    const greek = (await createGuest(ctx, "Μαρία", "Παπαδοπούλου")).id;
    await updateGuest(ctx, greek, { country: "Ελλάδα" });
    const r = await createReservation(ctx, { propertyId, guestId: greek, guestsCount: 1, checkIn: "2026-09-01", checkOut: "2026-09-03", totalAmount: 150, source: "BOOKING_COM" });
    let tax = await getStayTax(ctx, r.id, NOW);
    expect(value(tax.declarationForm, "foreigner")).toBe("Όχι");
    expect(keys(tax.declarationForm)).not.toContain("idNumber");
    expect(tax.declarationForm.missing).toEqual(["ΑΦΜ"]);

    await updateGuest(ctx, greek, { idType: "TAX_ID", idNumber: "123456789" });
    tax = await getStayTax(ctx, r.id, NOW);
    expect(value(tax.declarationForm, "taxId")).toBe("123456789");
    expect(value(tax.declarationForm, "platform")).toBe("Booking.com");
    expect(tax.declarationForm.missing).toEqual([]);
  });

  it("paid cancellations fill the cancellation section", async () => {
    const r = await createReservation(ctx, { propertyId, guestId, guestsCount: 1, checkIn: "2026-08-10", checkOut: "2026-08-12", totalAmount: 80, source: "BOOKING_COM" });
    await cancelReservation(ctx, r.id);
    const tax = await getStayTax(ctx, r.id, NOW);
    expect(tax.declarationForm.cancelled).toBe(true);
    expect(value(tax.declarationForm, "amount")).toBeNull();
    expect(value(tax.declarationForm, "cancelAmount")).toBe("80,00");
    expect(value(tax.declarationForm, "cancelDate")).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(tax.declarationForm.missing).toEqual([]);
  });
});
