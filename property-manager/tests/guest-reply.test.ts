import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { draftGuestReply, platformConversationUrl } from "@/lib/ai/reply";
import type { ChatProvider } from "@/lib/ai/provider";
import type { OrgContext } from "@/lib/permissions";
import { createReservation } from "@/lib/services/reservations";
import { createTenant, resetDatabase } from "./helpers";

describe("drafting replies to guest messages", () => {
  let ctx: OrgContext;
  let reservationId: string;

  beforeAll(async () => {
    await resetDatabase();
    ctx = await createTenant("Reply");
    const property = await db.property.create({
      data: { organizationId: ctx.organizationId, name: "Zenios Vyzantios", address: "Βυζαντίου 5", city: "Αθήνα", country: "Ελλάδα", basePrice: 60, maxGuests: 2 },
    });
    const guest = await db.guest.create({ data: { organizationId: ctx.organizationId, firstName: "Rogerio", lastName: "Silva", country: "Brazil", language: "en" } });
    reservationId = (await createReservation(ctx, { propertyId: property.id, guestId: guest.id, guestsCount: 1, checkIn: "2026-11-19", checkOut: "2026-11-23", totalAmount: 213, source: "AIRBNB", confirmationCode: "HM2FJKFQHC" })).id;
    await db.aIMemory.createMany({
      data: [
        { organizationId: ctx.organizationId, propertyId: property.id, kind: "GUEST_INFO", content: "Wi-Fi network: COSMOTE-sgtfeb, password: 29x9ts75", language: "en" },
        { organizationId: ctx.organizationId, propertyId: property.id, kind: "GUEST_INFO", content: "Free street parking around the corner.", language: "en" },
        { organizationId: ctx.organizationId, propertyId: property.id, kind: "GUEST_INFO", content: "Το Wi-Fi είναι COSMOTE-sgtfeb, κωδικός 29x9ts75", language: "el" },
      ],
    });
  });

  it("offline: answers from the saved notes on the topic asked, in the guest's language", async () => {
    const r = await draftGuestReply(ctx, { reservationId, guestMessage: "Hi! What is the wifi password?" }, null);
    expect(r.offline).toBe(true);
    expect(r.reply).toMatch(/^Hi Rogerio,/);
    expect(r.reply).toContain("COSMOTE-sgtfeb");
    expect(r.reply).not.toContain("parking");
    expect(r.conversationUrl).toBe("https://www.airbnb.com/hosting/reservations/details/HM2FJKFQHC");

    const greek = await draftGuestReply(ctx, { reservationId, guestMessage: "Καλησπέρα, ποιος είναι ο κωδικός για το ιντερνετ;" }, null);
    expect(greek.reply).toMatch(/^Γεια σας Rogerio,/);
    expect(greek.reply).toContain("Το Wi-Fi είναι COSMOTE-sgtfeb");

    const unknown = await draftGuestReply(ctx, { reservationId, guestMessage: "Can we bring our dog?" }, null);
    expect(unknown.reply).toContain("We'll check and get back to you shortly.");
    expect(unknown.usedInfo).toBe(0);
  });

  it("with an AI model: sends the stay and the property's notes, and returns its draft", async () => {
    let system = "";
    const provider: ChatProvider = {
      name: "fake",
      complete: async ({ messages }) => {
        system = String(messages[0].content);
        return { role: "assistant", content: "Hi Rogerio, the Wi-Fi password is 29x9ts75. Reply Team" };
      },
    };
    const r = await draftGuestReply(ctx, { reservationId, guestMessage: "wifi?" }, provider);
    expect(r).toMatchObject({ offline: false, reply: "Hi Rogerio, the Wi-Fi password is 29x9ts75. Reply Team", usedInfo: 3 });
    expect(system).toContain("Never invent Wi-Fi passwords");
    expect(system).toContain("Zenios Vyzantios, Βυζαντίου 5");
    expect(system).toContain("password: 29x9ts75");
  });

  it("links to the platform conversation when it can", () => {
    expect(platformConversationUrl("BOOKING_COM", "6444699988")).toBe("https://admin.booking.com/");
    expect(platformConversationUrl("DIRECT", null)).toBeNull();
  });
});

describe("telling the language of a guest's message", () => {
  it("recognises the usual languages and stays unsure on very short messages", async () => {
    const { detectMessageLanguage } = await import("@/lib/ai/reply");
    expect(detectMessageLanguage("Hi, what is the wifi password and where can we park?")).toBe("en");
    expect(detectMessageLanguage("Hallo, wo können wir parken? Danke!")).toBe("de");
    expect(detectMessageLanguage("Bonjour, où est le parking ? Merci")).toBe("fr");
    expect(detectMessageLanguage("Καλησπέρα, τι ώρα είναι το check-in;")).toBe("el");
    expect(detectMessageLanguage("wifi?")).toBeNull();
  });
});
