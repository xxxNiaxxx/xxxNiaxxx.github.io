import { describe, expect, it } from "vitest";
import { requestSchema } from "@/lib/schema";
import { englishJob, greekCv } from "./helpers";

const base = { cvText: greekCv, jobText: englishJob, language: "el", theme: "classic" };

describe("requestSchema", () => {
  it("accepts a valid first request", () => {
    expect(requestSchema.safeParse(base).success).toBe(true);
  });
  it("rejects short, oversized and unknown values", () => {
    expect(requestSchema.safeParse({ ...base, cvText: "too short" }).success).toBe(false);
    expect(requestSchema.safeParse({ ...base, cvText: "x".repeat(18_001) }).success).toBe(false);
    expect(requestSchema.safeParse({ ...base, language: "it" }).success).toBe(false);
    expect(requestSchema.safeParse({ ...base, theme: "neon" }).success).toBe(false);
  });
  it("requires a previous result for a revision", () => {
    expect(requestSchema.safeParse({ ...base, revision: "shorter" }).success).toBe(false);
    const previous = { cv: greekCv, coverLetter: "Αξιότιμη κυρία, κύριε, σας γράφω…", gaps: [] };
    expect(requestSchema.safeParse({ ...base, revision: "shorter", previous }).success).toBe(true);
  });
  it("strips control characters", () => {
    const parsed = requestSchema.parse({ ...base, cvText: `${greekCv}\u0000\u0007` });
    expect(parsed.cvText).toBe(greekCv);
  });
});
