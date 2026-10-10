import { describe, expect, it } from "vitest";
import { AUTOFILL_BOOKMARKLET, AUTOFILL_PREFIX, AUTOFILL_SOURCE, autofillPayload } from "@/lib/aade-autofill";

describe("AADE autofill bookmarklet", () => {
  it("copies only the fillable values, after the prefix", () => {
    const text = autofillPayload([
      { key: "ama", value: "00003478449" },
      { key: "checkIn", value: "31/10/2026" },
      { key: "taxId", value: null },
      { key: "foreigner", value: "Ναι" },
    ]);
    expect(text.startsWith(AUTOFILL_PREFIX)).toBe(true);
    expect(JSON.parse(text.slice(AUTOFILL_PREFIX.length))).toEqual({ checkIn: "31/10/2026", foreigner: "Ναι" });
  });

  it("is valid JavaScript and a javascript: bookmark", () => {
    expect(() => new Function(AUTOFILL_SOURCE)).not.toThrow();
    expect(AUTOFILL_BOOKMARKLET.startsWith("javascript:")).toBe(true);
    expect(decodeURIComponent(AUTOFILL_BOOKMARKLET.slice("javascript:".length))).toBe(AUTOFILL_SOURCE);
    // It never submits the form.
    expect(AUTOFILL_SOURCE).not.toMatch(/\.submit\(|requestSubmit/);
  });
});
