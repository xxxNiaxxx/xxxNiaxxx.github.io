import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { answerTopic, applySuggestions, htmlToText, interviewState, resetSkipped, skipTopic, suggestFromListing, suggestFromText } from "@/lib/ai/interview";
import type { ChatProvider } from "@/lib/ai/provider";
import type { OrgContext } from "@/lib/permissions";
import { getGuide, publicPagesLink } from "@/lib/services/guest-pages";
import { createProperty, createTenant, resetDatabase } from "./helpers";

const LISTING = `
<html><head><script type="application/ld+json">{"@type":"Hotel","name":"Elia","description":"Φωτεινό διαμέρισμα 300 μ. από την παραλία."}</script>
<script>var x = "wifi tracking";</script></head><body>
<h2>Δημοφιλέστερες παροχές</h2><ul><li>Δωρεάν WiFi</li><li>Δωρεάν ιδιωτικός χώρος στάθμευσης</li><li>Κλιματισμός</li><li>Κουζίνα</li></ul>
<div>Check-in</div><div>Από 15:00 έως 23:00</div>
<div>Check-out</div><div>Έως 11:00</div>
<div>Κατοικίδια</div><div>Δεν επιτρέπονται κατοικίδια.</div>
<div>Κάπνισμα</div><div>Το κάπνισμα δεν επιτρέπεται.</div>
<p>Αεροδρόμιο Ηρακλείου Νίκος Καζαντζάκης: 12 χλμ</p>
</body></html>`;

describe("knowledge interview", () => {
  let ctx: OrgContext;
  let propertyId: string;

  beforeAll(async () => {
    await resetDatabase();
    ctx = await createTenant("Interview");
    propertyId = (await createProperty(ctx, { name: "Elia" })).id;
  });

  it("asks the most important questions first and saves answers as guest information", async () => {
    let s = await interviewState(ctx, propertyId);
    expect(s.answered).toBe(0);
    expect(s.next?.key).toBe("checkInTime");

    await expect(answerTopic(ctx, { propertyId, topic: "checkInTime", answer: "τρεις" }, null)).rejects.toThrow(/ΩΩ:ΛΛ/);
    await answerTopic(ctx, { propertyId, topic: "checkInTime", answer: "15.00" }, null);
    await answerTopic(ctx, { propertyId, topic: "checkOutTime", answer: "11:00" }, null);
    const p = await db.property.findUniqueOrThrow({ where: { id: propertyId } });
    expect([p.checkInTime, p.checkOutTime]).toEqual(["15:00", "11:00"]);

    s = await interviewState(ctx, propertyId);
    expect(s.next?.key).toBe("access");
    expect(s.answered).toBe(2);
  });

  it("refuses door codes and asks a follow-up where the answer leaves the guest guessing", async () => {
    await expect(answerTopic(ctx, { propertyId, topic: "access", answer: "Κλειδοθήκη με κωδικό 4821" }, null)).rejects.toThrow(/κωδικούς/);
    const r = await answerTopic(ctx, { propertyId, topic: "access", answer: "Κλειδοθήκη δίπλα στην πόρτα" }, null);
    expect(r.followUp).toMatch(/κλειδοθήκη/);
    await answerTopic(ctx, { propertyId, topic: "access", answer: "Αριστερά της εισόδου, πίσω από τη γλάστρα", followUp: r.followUp! }, null);
    const note = await db.aIMemory.findFirstOrThrow({ where: { propertyId, topic: "access" } });
    expect(note.content).toBe("Είσοδος: Κλειδοθήκη δίπλα στην πόρτα\nΑριστερά της εισόδου, πίσω από τη γλάστρα");
    expect(note.source).toBe("INTERVIEW");

    // Answering again replaces the note instead of adding another one.
    await answerTopic(ctx, { propertyId, topic: "access", answer: "Σας υποδεχόμαστε εμείς" }, null);
    expect(await db.aIMemory.count({ where: { propertyId, topic: "access" } })).toBe(1);
  });

  it("uses the AI model's follow-up when one is connected", async () => {
    const provider: ChatProvider = { name: "fake", complete: async () => ({ role: "assistant", content: "Υπάρχει θέση και για μεγάλα αυτοκίνητα;" }) };
    expect((await answerTopic(ctx, { propertyId, topic: "parking", answer: "Στην αυλή" }, provider)).followUp).toBe("Υπάρχει θέση και για μεγάλα αυτοκίνητα;");
    const none: ChatProvider = { name: "fake", complete: async () => ({ role: "assistant", content: "NONE" }) };
    expect((await answerTopic(ctx, { propertyId, topic: "parking", answer: "Στην αυλή, χωράει SUV" }, none)).followUp).toBeNull();
  });

  it("skipped questions are not asked again until reset", async () => {
    await skipTopic(ctx, { propertyId, topic: "wifi" });
    let s = await interviewState(ctx, propertyId);
    expect(s.answers.find((a) => a.key === "wifi")?.status).toBe("skipped");
    expect(s.next?.key).toBe("directions");
    await resetSkipped(ctx, propertyId);
    s = await interviewState(ctx, propertyId);
    expect(s.next?.key).toBe("wifi");
  });

  it("reads a listing page: times, facilities and rules, without the page's scripts", () => {
    const text = htmlToText(LISTING);
    expect(text).toContain("Φωτεινό διαμέρισμα 300 μ. από την παραλία.");
    expect(text).not.toContain("tracking");
    const s = suggestFromText(text);
    expect(s.checkInTime).toBe("15:00");
    expect(s.checkOutTime).toBe("11:00");
    expect(s.wifi).toBe("Δωρεάν WiFi");
    expect(s.parking).toBe("Δωρεάν ιδιωτικός χώρος στάθμευσης");
    expect(s.houseRules).toContain("Δεν επιτρέπονται κατοικίδια.");
    expect(s.houseRules).toContain("Το κάπνισμα δεν επιτρέπεται.");
    expect(s.directions).toContain("Αεροδρόμιο Ηρακλείου");
    expect(s.nearby).toContain("παραλία");
  });

  it("suggests from pasted text and saves only what the manager confirms", async () => {
    const other = (await createProperty(ctx, { name: "Thalassa" })).id;
    const r = await suggestFromListing(ctx, { propertyId: other, text: htmlToText(LISTING) }, null);
    expect(r.readPage).toBe(true);
    expect(r.suggestions.map((x) => x.key)).toEqual(expect.arrayContaining(["checkInTime", "wifi", "parking", "houseRules"]));

    await expect(suggestFromListing(ctx, { propertyId: other, url: "https://example.com/listing" }, null)).rejects.toThrow(/Booking\.com ή Airbnb/);

    const s = await applySuggestions(ctx, {
      propertyId: other,
      answers: [
        { topic: "checkInTime", answer: "15:00" },
        { topic: "wifi", answer: "Δωρεάν WiFi — δίκτυο Thalassa, κωδικός στο ψυγείο" },
        { topic: "houseRules", answer: "Δεν επιτρέπονται κατοικίδια." },
      ],
    });
    expect(s.answered).toBe(3);
    const note = await db.aIMemory.findFirstOrThrow({ where: { propertyId: other, topic: "wifi" } });
    expect(note.source).toBe("IMPORT");

    // The answers appear in the guest guide.
    const { guidePath } = await publicPagesLink(ctx, other);
    const guide = await getGuide(guidePath.split("/").pop()!, "el");
    expect(guide?.houseRules).toBe("Δεν επιτρέπονται κατοικίδια.");
    expect(guide?.notes).toContain("Wi-Fi: Δωρεάν WiFi — δίκτυο Thalassa, κωδικός στο ψυγείο");
  });

  it("uses the AI model to read the listing when one is connected", async () => {
    const provider: ChatProvider = {
      name: "fake",
      complete: async () => ({ role: "assistant", content: 'Ορίστε:\n{"wifi": "Δωρεάν Wi-Fi", "kitchen": "Πλήρως εξοπλισμένη κουζίνα", "unknown": "x", "trash": ""}' }),
    };
    const r = await suggestFromListing(ctx, { propertyId, text: htmlToText(LISTING) }, provider);
    expect(r.suggestions.map((x) => [x.key, x.answer])).toEqual([["wifi", "Δωρεάν Wi-Fi"], ["kitchen", "Πλήρως εξοπλισμένη κουζίνα"]]);
  });

  it("keeps other organizations out", async () => {
    const stranger = await createTenant("Other");
    await expect(interviewState(stranger, propertyId)).rejects.toThrow();
    await expect(answerTopic(stranger, { propertyId, topic: "wifi", answer: "x" }, null)).rejects.toThrow();
  });
});
