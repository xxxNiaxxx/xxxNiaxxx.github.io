import { beforeAll, describe, expect, it } from "vitest";
import { sendChatMessage } from "@/lib/ai/chat";
import { db } from "@/lib/db";
import { guestLanguage, languageForCountry } from "@/lib/i18n/guest-language";
import { guestMessageTemplate } from "@/lib/i18n/guest-messages";
import type { OrgContext } from "@/lib/permissions";
import { createReservation } from "@/lib/services/reservations";
import { updateGuest } from "@/lib/services/guests";
import { createProperty, createTenant, resetDatabase } from "./helpers";

describe("guest language", () => {
  it("derives the language from the country code or name (Greek or English)", () => {
    expect(languageForCountry("DE")).toBe("de");
    expect(languageForCountry("Γερμανία")).toBe("de");
    expect(languageForCountry("germany")).toBe("de");
    expect(languageForCountry("Κύπρος")).toBe("el");
    expect(languageForCountry("Ελλάδα")).toBe("el");
    expect(languageForCountry("FR")).toBe("fr");
    expect(languageForCountry("Brasil")).toBe("pt");
    expect(languageForCountry("JP")).toBe("en");
    expect(languageForCountry(null)).toBe("en");
  });

  it("an explicit preference wins over the country", () => {
    expect(guestLanguage({ country: "DE", language: "en" })).toBe("en");
    expect(guestLanguage({ country: "DE", language: null })).toBe("de");
    expect(guestLanguage({ country: "DE", language: "xx" })).toBe("de");
  });

  it("formats dates in the guest's language", () => {
    const de = guestMessageTemplate("checkin", "de", { name: "Lukas", property: "Villa Elia", checkIn: "2026-10-09", checkOut: "2026-10-14" });
    expect(de).toContain("Hallo Lukas");
    expect(de).toContain("9. Oktober");
    const es = guestMessageTemplate("checkin", "es", { name: "Clara", property: "Villa Elia", checkIn: "2026-10-09", checkOut: "2026-10-14" });
    expect(es).toContain("9 de octubre");
  });
});

describe("AI drafts in the guest's language", () => {
  let ctx: OrgContext;
  const now = new Date("2026-10-01T08:00:00Z");

  beforeAll(async () => {
    await resetDatabase();
    ctx = await createTenant("Lang");
    const p = await createProperty(ctx, { name: "Villa Elia" });
    const guests = [
      { firstName: "Lukas", lastName: "Becker", country: "DE" },
      { firstName: "Chloé", lastName: "Martin", country: "Γαλλία" },
      { firstName: "Maria", lastName: "Papadopoulou", country: "GR" },
      { firstName: "Hiro", lastName: "Tanaka", country: "JP" },
    ];
    let day = 5;
    for (const g of guests) {
      const guest = await db.guest.create({ data: { ...g, organizationId: ctx.organizationId } });
      await createReservation(ctx, { propertyId: p.id, guestId: guest.id, checkIn: `2026-10-${String(day).padStart(2, "0")}`, checkOut: `2026-10-${String(day + 2).padStart(2, "0")}`, guestsCount: 2, totalAmount: 300 });
      day += 3;
    }
  });

  const draft = async (q: string) => {
    const res = await sendChatMessage(ctx, { message: q }, { provider: null, now });
    const action = res.actions.at(-1)!;
    return { reply: res.message.content, payload: action.payload as { message: string; language: string; languageName: string } };
  };

  it("writes German to a guest from Germany", async () => {
    const { reply, payload } = await draft("Στείλε οδηγίες άφιξης στον Lukas Becker");
    expect(payload.language).toBe("de");
    expect(payload.message).toContain("Hallo Lukas");
    expect(reply).toContain("γερμανικά");
  });

  it("writes French to a guest whose country is written in Greek", async () => {
    const { payload } = await draft("Στείλε οδηγίες άφιξης στη Chloé Martin");
    expect(payload.language).toBe("fr");
    expect(payload.message).toContain("Bonjour Chloé");
  });

  it("writes Greek to a Greek guest and English when the language is unknown", async () => {
    expect((await draft("Στείλε οδηγίες άφιξης στη Maria Papadopoulou")).payload.message).toContain("Γεια σας Maria");
    expect((await draft("Στείλε οδηγίες άφιξης στον Hiro Tanaka")).payload.message).toContain("Hi Hiro");
  });

  it("respects a language chosen on the guest profile", async () => {
    const lukas = await db.guest.findFirstOrThrow({ where: { organizationId: ctx.organizationId, firstName: "Lukas" } });
    await updateGuest(ctx, lukas.id, { language: "en" });
    expect((await draft("Στείλε οδηγίες άφιξης στον Lukas Becker")).payload.message).toContain("Hi Lukas");
  });
});
