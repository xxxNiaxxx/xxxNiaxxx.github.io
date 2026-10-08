import { beforeAll, describe, expect, it } from "vitest";
import type { OrgContext } from "@/lib/permissions";
import { createProperty, updateProperty } from "@/lib/services/properties";
import { createTenant, resetDatabase } from "./helpers";

describe("properties", () => {
  let ctx: OrgContext;

  beforeAll(async () => {
    await resetDatabase();
    ctx = await createTenant("Props");
  });

  it("a partial update (compliance tick, status toggle) keeps the other fields", async () => {
    const villa = await createProperty(ctx, {
      name: "Villa", city: "Chania", country: "Greece", basePrice: 300, bedrooms: 4, bathrooms: 3, maxGuests: 8, kind: "DETACHED_HOUSE", areaSqm: 150, currency: "EUR",
    });
    await updateProperty(ctx, villa.id, { compliance: { fireExtinguisher: true } });
    const updated = await updateProperty(ctx, villa.id, { status: "INACTIVE" });
    expect(updated).toMatchObject({ bedrooms: 4, bathrooms: 3, maxGuests: 8, kind: "DETACHED_HOUSE", status: "INACTIVE", compliance: { fireExtinguisher: true } });
  });
});
