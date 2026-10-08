import { beforeAll, describe, expect, it } from "vitest";
import { approveAction, proposeAction, rejectAction, updateActionPayload } from "@/lib/ai/actions";
import { sendChatMessage } from "@/lib/ai/chat";
import type { ChatProvider } from "@/lib/ai/provider";
import { runTool, type ToolContext } from "@/lib/ai/tools";
import { db } from "@/lib/db";
import type { OrgContext } from "@/lib/permissions";
import { createGuest, createProperty, createReservationRow, createTenant, resetDatabase } from "./helpers";

describe("AI tools and actions", () => {
  let a: OrgContext;
  let b: OrgContext;
  let aGuestId: string;
  let bGuestId: string;
  let bPropertyId: string;
  let bReservationId: string;
  const tc = (org: OrgContext): ToolContext => ({ org, conversationId: null, now: new Date("2026-05-02T09:00:00Z") });

  beforeAll(async () => {
    await resetDatabase();
    a = await createTenant("A");
    b = await createTenant("B");
    await createProperty(a, { name: "Alpha House" });
    aGuestId = (await createGuest(a, "John", "Alpha")).id;
    const bProperty = await createProperty(b, { name: "Bravo Secret Villa" });
    bPropertyId = bProperty.id;
    bGuestId = (await createGuest(b, "John", "Bravo")).id;
    bReservationId = (await createReservationRow(b, { propertyId: bProperty.id, guestId: bGuestId, checkIn: "2026-05-01", checkOut: "2026-05-05" })).id;
  });

  it("AI tools cannot read another organization's data", async () => {
    expect(await runTool("get_property", { propertyId: bPropertyId }, tc(a))).toMatchObject({ error: "Property not found" });
    expect(await runTool("get_property", { name: "Bravo" }, tc(a))).toMatchObject({ error: "Property not found" });
    expect(await runTool("get_guest", { guestId: bGuestId }, tc(a))).toMatchObject({ error: "Guest not found" });
    expect(await runTool("get_reservation", { reservationId: bReservationId }, tc(a))).toMatchObject({ error: "Reservation not found" });
    const props = (await runTool("list_properties", {}, tc(a))) as { properties: { name: string }[] };
    expect(props.properties.map((p) => p.name)).toEqual(["Alpha House"]);
    const guests = (await runTool("list_guests", { q: "John" }, tc(a))) as { guests: { lastName: string }[] };
    expect(guests.guests.map((g) => g.lastName)).toEqual(["Alpha"]);
  });

  it("AI tools cannot propose actions on another organization's guest", async () => {
    const res = await runTool("create_message_draft", { guestId: bGuestId, message: "hi" }, tc(a));
    expect(res).toMatchObject({ error: "Guest not found" });
    expect(await db.aIAction.count({ where: { organizationId: a.organizationId } })).toBe(0);
  });

  it("a proposed message is not sent until it is approved", async () => {
    const res = (await runTool("create_message_draft", { guestId: aGuestId, message: "Welcome!" }, tc(a))) as {
      proposedAction: { id: string; status: string };
    };
    expect(res.proposedAction.status).toBe("PROPOSED");
    expect(await db.message.count({ where: { guestId: aGuestId } })).toBe(0);

    await expect(approveAction(b, res.proposedAction.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await db.message.count({ where: { guestId: aGuestId } })).toBe(0);

    const edited = await updateActionPayload(a, res.proposedAction.id, { message: "Welcome to Alpha House!" });
    expect(edited.payload.message).toBe("Welcome to Alpha House!");

    const executed = await approveAction(a, res.proposedAction.id);
    expect(executed.status).toBe("EXECUTED");
    const messages = await db.message.findMany({ where: { guestId: aGuestId } });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ status: "SENT", channel: "INTERNAL", content: "Welcome to Alpha House!" });

    await expect(approveAction(a, res.proposedAction.id)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await db.message.count({ where: { guestId: aGuestId } })).toBe(1);
  });

  it("a rejected action can never be executed", async () => {
    const action = await proposeAction(a, { type: "SEND_GUEST_MESSAGE", payload: { guestId: aGuestId, message: "nope" } });
    const rejected = await rejectAction(a, action.id);
    expect(rejected.status).toBe("REJECTED");
    await expect(approveAction(a, action.id)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await db.message.count({ where: { content: "nope" } })).toBe(0);
  });

  it("the chat loop scopes model tool calls to the caller's organization", async () => {
    let round = 0;
    const seen: string[] = [];
    const fake: ChatProvider = {
      name: "fake",
      async complete({ messages }) {
        round++;
        if (round === 1) {
          return {
            role: "assistant",
            content: null,
            tool_calls: [
              { id: "1", type: "function", function: { name: "get_property", arguments: JSON.stringify({ propertyId: bPropertyId }) } },
              { id: "2", type: "function", function: { name: "create_message_draft", arguments: JSON.stringify({ guestId: aGuestId, message: "Hello John" }) } },
            ],
          };
        }
        for (const m of messages) if (m.role === "tool") seen.push(m.content);
        return { role: "assistant", content: "Drafted. Approve it below." };
      },
    };
    const res = await sendChatMessage(a, { message: "Send John a hello" }, { provider: fake });
    expect(res.mode).toBe("llm");
    expect(seen.join("\n")).not.toContain("Bravo Secret Villa");
    expect(seen[0]).toContain("Property not found");
    expect(res.actions).toHaveLength(1);
    expect(res.actions[0]).toMatchObject({ type: "SEND_GUEST_MESSAGE", status: "PROPOSED" });
    expect(await db.message.count({ where: { content: "Hello John" } })).toBe(0);
  });

  it("offline assistant answers from tools and proposes instead of acting", async () => {
    const res = await sendChatMessage(a, { message: "Send a message to John Alpha" }, { provider: null });
    expect(res.mode).toBe("offline");
    expect(res.toolsUsed).toContain("create_message_draft");
    expect(res.actions.at(-1)?.status).toBe("PROPOSED");
  });

  it("conversations are private to their organization", async () => {
    const res = await sendChatMessage(a, { message: "hello" }, { provider: null });
    await expect(sendChatMessage(b, { conversationId: res.conversationId, message: "peek" }, { provider: null })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
