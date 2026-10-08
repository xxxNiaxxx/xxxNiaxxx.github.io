import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import type { OrgContext } from "@/lib/permissions";
import { updateGuest } from "@/lib/services/guests";
import { createReservation, updateReservation } from "@/lib/services/reservations";
import { getStayTax, updateTaxSettings } from "@/lib/services/tax";
import { createGuest, createTenant, resetDatabase } from "./helpers";

const NOW = new Date("2026-12-01T09:00:00Z");
const value = (form: { fields: { key: string; value: string | null }[] }, key: string) => form.fields.find((f) => f.key === key)?.value;

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
    expect(tax.declarationForm.missing).toEqual(["ΑΦΜ / Αριθμός διαβατηρίου"]);
    expect(value(tax.declarationForm, "bookingNumber")).toBe("HM2FJKFQHC");
    expect(value(tax.declarationForm, "amount")).toBe("213,17");
    expect(value(tax.declarationForm, "checkIn")).toBe("19/11/2026");
    expect(value(tax.declarationForm, "paymentMethod")).toBe("Λογαριασμός πληρωμών ημεδαπής");
    expect(tax.declarationForm.paymentMethodIsDefault).toBe(true);

    await updateGuest(ctx, guestId, { idNumber: "YB1234567" });
    await updateReservation(ctx, r.id, { paymentMethod: "CARD" });
    tax = await getStayTax(ctx, r.id, NOW);
    expect(tax.declarationForm.missing).toEqual([]);
    expect(value(tax.declarationForm, "idNumber")).toBe("YB1234567");
    expect(value(tax.declarationForm, "paymentMethod")).toBe("Κάρτα");
  });

  it("individuals declare the whole room price; direct stays need a payment method", async () => {
    await updateTaxSettings(ctx, { taxRegime: "INDIVIDUAL" });
    const r = await createReservation(ctx, { propertyId, guestId, guestsCount: 1, checkIn: "2026-10-01", checkOut: "2026-10-03", totalAmount: 210.03, source: "DIRECT" });
    const tax = await getStayTax(ctx, r.id, NOW);
    expect(value(tax.declarationForm, "amount")).toBe("210,03");
    // A direct stay has no booking number: not counted as missing.
    expect(value(tax.declarationForm, "bookingNumber")).toBeNull();
    expect(tax.declarationForm.missing).toEqual(["Τρόπος πληρωμής"]);
  });
});
