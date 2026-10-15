import { describe, expect, it } from "vitest";
import { MESSAGE_TEMPLATE_GROUPS } from "@/lib/message-templates";

describe("message templates", () => {
  const all = MESSAGE_TEMPLATE_GROUPS.flatMap((g) => g.templates);
  it("have unique ids and some text", () => {
    expect(new Set(all.map((t) => t.id)).size).toBe(all.length);
    for (const t of all) expect(t.text.length).toBeGreaterThan(40);
  });
  it("personal messages come from the team and keep the name to fill in", () => {
    for (const t of MESSAGE_TEMPLATE_GROUPS.slice(0, 2).flatMap((g) => g.templates).filter((t) => t.id !== "quote")) {
      expect(t.text).toContain("Από την ομάδα του Βραχυχρόνια.ai");
      expect(t.text).toContain("[Όνομα]");
    }
  });
});
