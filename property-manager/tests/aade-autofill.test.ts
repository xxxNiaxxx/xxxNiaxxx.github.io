import { describe, expect, it } from "vitest";
import { bookmarkletFor, AUTOFILL_BOOKMARKLET, AUTOFILL_LOADER, AUTOFILL_PREFIX, AUTOFILL_SCRIPT_URL, AUTOFILL_SOURCE, autofillPayload } from "@/lib/aade-autofill";

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
    expect(() => new Function(AUTOFILL_LOADER)).not.toThrow();
    expect(AUTOFILL_BOOKMARKLET.startsWith("javascript:")).toBe(true);
    // The bookmark loads the latest script, with its own copy as fallback.
    const bookmark = decodeURIComponent(AUTOFILL_BOOKMARKLET.slice("javascript:".length));
    expect(bookmark).toContain(AUTOFILL_SCRIPT_URL);
    expect(bookmark).toContain(AUTOFILL_SOURCE);
    // It never submits the form.
    expect(AUTOFILL_SOURCE).not.toMatch(/\.submit\(|requestSubmit/);
  });
});

describe("autofill script for the mobile app", () => {
  it("is served as JavaScript and takes values handed over by the app", async () => {
    const { GET } = await import("@/app/api/aade/autofill-script/route");
    const res = GET();
    expect(res.headers.get("content-type")).toContain("javascript");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const body = await res.text();
    expect(body).toBe(AUTOFILL_SOURCE);
    expect(body).toContain("window.__AADE_AUTOFILL__");
    expect(body).toContain("ReactNativeWebView");
  });

  it("builds a bookmark that carries its key", () => {
    const url = bookmarkletFor("afk_abc-123");
    expect(url.startsWith("javascript:")).toBe(true);
    const code = decodeURIComponent(url.slice("javascript:".length));
    expect(code.startsWith('window.__AADE_KEY__="afk_abc-123";')).toBe(true);
    expect(() => new Function(code)).not.toThrow();
  });
});
