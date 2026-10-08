import { beforeAll, describe, expect, it } from "vitest";
import { approveAction, updateActionPayload } from "@/lib/ai/actions";
import { sendChatMessage } from "@/lib/ai/chat";
import { createMemory, deleteMemory, fillTemplate, listMemories, memoriesForPrompt, toTemplate } from "@/lib/ai/memory";
import type { ChatProvider } from "@/lib/ai/provider";
import { translateMessage } from "@/lib/ai/translate";
import { db } from "@/lib/db";
import type { OrgContext } from "@/lib/permissions";
import { createReservation } from "@/lib/services/reservations";
import { createProperty, createTenant, resetDatabase } from "./helpers";

const now = new Date("2026-10-01T08:00:00Z");

describe("templates", () => {
  it("turns an approved message into a reusable template and fills it for another guest", () => {
    const t = toTemplate("Hallo Lukas,\n\nwillkommen in Villa Elia am 5. Oktober bis 7. Oktober. Lukas, bis bald!", {
      firstName: "Lukas", property: "Villa Elia", checkIn: "2026-10-05", checkOut: "2026-10-07", language: "de",
    });
    expect(t).toBe("Hallo {name},\n\nwillkommen in {property} am {checkIn} bis {checkOut}. {name}, bis bald!");
    expect(fillTemplate(t, { name: "Anna", property: "Sea View", checkIn: "2026-11-02", checkOut: "2026-11-04", language: "de" })).toBe(
      "Hallo Anna,\n\nwillkommen in Sea View am 2. November bis 4. November. Anna, bis bald!",
    );
  });
});

describe("the assistant learns from managers", () => {
  let ctx: OrgContext;
  let other: OrgContext;
  let villaId: string;

  beforeAll(async () => {
    await resetDatabase();
    ctx = await createTenant("Learn");
    other = await createTenant("Other");
    villaId = (await createProperty(ctx, { name: "Villa Elia" })).id;
    let day = 5;
    for (const g of [
      { firstName: "Lukas", lastName: "Becker", country: "DE" },
      { firstName: "Hannah", lastName: "Schmidt", country: "DE" },
      { firstName: "Maria", lastName: "Papadopoulou", country: "GR" },
    ]) {
      const guest = await db.guest.create({ data: { ...g, organizationId: ctx.organizationId } });
      await createReservation(ctx, { propertyId: villaId, guestId: guest.id, checkIn: `2026-10-${String(day).padStart(2, "0")}`, checkOut: `2026-10-${String(day + 2).padStart(2, "0")}`, guestsCount: 2, totalAmount: 300 });
      day += 3;
    }
  });

  const chat = (message: string) => sendChatMessage(ctx, { message }, { provider: null, now });

  it("remembers property information from the chat and uses it in arrival messages of the same language", async () => {
    const res = await chat("Θυμήσου ότι στη Villa Elia το πάρκινγκ είναι μπροστά από την πύλη");
    expect(res.toolsUsed).toContain("save_memory");
    const saved = await listMemories(ctx, { kind: "GUEST_INFO", propertyId: villaId });
    expect(saved.map((m) => [m.content, m.language, m.source])).toEqual([["Το πάρκινγκ είναι μπροστά από την πύλη", "el", "CHAT"]]);

    const greek = await chat("Στείλε οδηγίες άφιξης στη Maria Papadopoulou");
    expect((greek.actions.at(-1)!.payload as { message: string }).message).toContain("• Το πάρκινγκ είναι μπροστά από την πύλη");
    // Without an LLM, Greek notes are not pasted into a German message.
    const german = await chat("Στείλε οδηγίες άφιξης στον Lukas Becker");
    expect((german.actions.at(-1)!.payload as { message: string }).message).not.toContain("πάρκινγκ");
  });

  it("learns the manager's version of a draft once it is edited and approved", async () => {
    const first = await chat("Στείλε οδηγίες άφιξης στον Lukas Becker");
    const action = first.actions.at(-1)!;
    const custom = "Servus Lukas!\n\nDein Zimmer in Villa Elia ist ab 5. Oktober bereit. Schlüssel liegt im Safe.\n\nBis bald, Alex";
    await updateActionPayload(ctx, action.id, { message: custom });
    const executed = await approveAction(ctx, action.id);
    expect(executed.result?.learnedTemplateId).toBeTruthy();

    const templates = await listMemories(ctx, { kind: "MESSAGE_TEMPLATE" });
    expect(templates).toHaveLength(1);
    expect(templates[0]).toMatchObject({ language: "de", messageKind: "checkin", source: "EDIT" });
    expect(templates[0].content).toContain("Servus {name}!");

    // Next German guest gets the manager's wording with their own details.
    const next = await chat("Στείλε οδηγίες άφιξης στη Hannah Schmidt");
    expect((next.actions.at(-1)!.payload as { message: string }).message).toBe(
      "Servus Hannah!\n\nDein Zimmer in Villa Elia ist ab 8. Oktober bereit. Schlüssel liegt im Safe.\n\nBis bald, Alex",
    );
    expect(next.message.content).toContain("με βάση το πρότυπο");
  });

  it("does not learn from drafts approved without changes", async () => {
    const res = await chat("Στείλε οδηγίες άφιξης στη Maria Papadopoulou");
    const executed = await approveAction(ctx, res.actions.at(-1)!.id);
    expect(executed.result?.learnedTemplateId).toBeNull();
    expect(await listMemories(ctx, { kind: "MESSAGE_TEMPLATE" })).toHaveLength(1);
  });

  it("keeps each organization's knowledge private", async () => {
    const mine = await createMemory(ctx, { kind: "PREFERENCE", content: "Υπογράφουμε: Η ομάδα Learn" });
    expect(await listMemories(other)).toHaveLength(0);
    expect(await memoriesForPrompt(other)).toBe("");
    expect(await memoriesForPrompt(ctx)).toContain("Υπογράφουμε: Η ομάδα Learn");
    await expect(deleteMemory(other, mine.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(createMemory(other, { kind: "GUEST_INFO", content: "Wi-Fi: x", propertyId: villaId })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("gives the LLM the team's knowledge in its instructions", async () => {
    let system = "";
    const fake: ChatProvider = {
      name: "fake",
      async complete({ messages }) {
        system = messages[0].content ?? "";
        return { role: "assistant", content: "Εντάξει." };
      },
    };
    await sendChatMessage(ctx, { message: "Γεια" }, { provider: fake, now });
    expect(system).toContain("πάρκινγκ είναι μπροστά από την πύλη");
    expect(system).toContain("Servus {name}!");
  });
});

describe("translation", () => {
  let ctx: OrgContext;
  let guestId: string;
  beforeAll(async () => {
    ctx = await createTenant("Translate");
    guestId = (await db.guest.create({ data: { organizationId: ctx.organizationId, firstName: "Lukas", lastName: "B", country: "DE" } })).id;
  });

  it("needs an AI provider", async () => {
    await expect(translateMessage(ctx, { text: "Καλώς ήρθατε", guestId }, null)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("translates into the guest's language", async () => {
    let asked = "";
    const fake: ChatProvider = {
      name: "fake",
      async complete({ messages }) {
        asked = messages[0].content ?? "";
        return { role: "assistant", content: "Willkommen!" };
      },
    };
    const res = await translateMessage(ctx, { text: "Καλώς ήρθατε!", guestId }, fake);
    expect(res).toEqual({ text: "Willkommen!", language: "de", languageName: "Γερμανικά" });
    expect(asked).toContain("into German");
  });
});
