import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as configGet } from "@/app/api/config/route";
import { POST as exportDocx } from "@/app/api/export/docx/route";
import { POST as exportPdf } from "@/app/api/export/pdf/route";
import { POST as generate } from "@/app/api/generate/route";
import { resetMemoryKv } from "@/lib/kv";
import { aiReply, englishJob, greekCv, jsonRequest } from "./helpers";

const good = { cv: greekCv, coverLetter: "Αξιότιμη κυρία, κύριε, με ενδιαφέρον υποβάλλω την αίτησή μου.", gaps: ["Διοίκηση front office"] };
const body = { cvText: greekCv, jobText: englishJob, language: "el", theme: "classic" };

beforeEach(() => {
  resetMemoryKv();
  vi.stubEnv("AI_BASE_URL", "http://ai.test/v1");
  vi.stubEnv("AI_API_KEY", "secret-key-value");
  vi.stubEnv("AI_MODEL", "test-model");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("POST /api/generate", () => {
  it("returns a result and the figures to verify", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => aiReply({ ...good, cv: `${greekCv}\n- Αύξηση πωλήσεων 40%` })));
    const response = await generate(jsonRequest("/api/generate", body));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const data = await response.json();
    expect(data.result.gaps).toEqual(good.gaps);
    expect(data.checks).toEqual(["40%"]);
  });

  it("rejects malformed JSON, invalid input and oversized bodies", async () => {
    expect((await generate(jsonRequest("/api/generate", "{not json"))).status).toBe(400);
    expect((await generate(jsonRequest("/api/generate", { ...body, cvText: "short" }))).status).toBe(400);
    const huge = await generate(jsonRequest("/api/generate", { ...body, cvText: "x".repeat(300_000) }));
    expect(huge.status).toBe(413);
    expect(await huge.json()).toEqual({ error: "too_large" });
  });

  it("returns a friendly code, not secrets, when AI is not configured", async () => {
    vi.stubEnv("AI_API_KEY", "");
    const response = await generate(jsonRequest("/api/generate", body));
    expect(response.status).toBe(503);
    expect(await response.text()).toBe('{"error":"ai_not_configured"}');
  });

  it("enforces the daily per-IP limit", async () => {
    vi.stubEnv("MAX_GENERATIONS_PER_IP_PER_DAY", "1");
    vi.stubGlobal("fetch", vi.fn(async () => aiReply(good)));
    expect((await generate(jsonRequest("/api/generate", body))).status).toBe(200);
    expect((await generate(jsonRequest("/api/generate", body))).status).toBe(429);
    expect((await generate(jsonRequest("/api/generate", body, { "x-forwarded-for": "198.51.100.1" }))).status).toBe(200);
  });

  it("never logs CV or job text, even on failures", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const logs = [vi.spyOn(console, "info").mockImplementation(() => {}), vi.spyOn(console, "error").mockImplementation(() => {}), vi.spyOn(console, "log").mockImplementation(() => {})];
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error(`boom ${greekCv}`); }));
    await generate(jsonRequest("/api/generate", body));
    vi.stubGlobal("fetch", vi.fn(async () => aiReply(good)));
    await generate(jsonRequest("/api/generate", { ...body, revision: "x" }));
    await generate(jsonRequest("/api/generate", body));
    const written = logs.flatMap((spy) => spy.mock.calls.flat()).join("\n");
    expect(written).not.toContain("Παπαδοπούλου");
    expect(written).not.toContain("front office manager");
    expect(written).not.toContain("secret-key-value");
  });
});

describe("export routes", () => {
  const exportBody = { document: "cv", theme: "minimal", language: "el", cv: greekCv, coverLetter: good.coverLetter };

  it("downloads a PDF with a safe filename", async () => {
    const response = await exportPdf(jsonRequest("/api/export/pdf", exportBody));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="applyready-cv-minimal-\d{4}-\d{2}-\d{2}\.pdf"$/);
    expect(Buffer.from(await response.arrayBuffer()).subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("downloads a DOCX cover letter", async () => {
    const response = await exportDocx(jsonRequest("/api/export/docx", { ...exportBody, document: "letter" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("applyready-cover-letter-minimal-");
    expect(Buffer.from(await response.arrayBuffer()).subarray(0, 2).toString()).toBe("PK");
  });

  it("locks premium themes without a valid entitlement", async () => {
    vi.stubEnv("ENTITLEMENT_SECRET", "x".repeat(40));
    const response = await exportPdf(jsonRequest("/api/export/pdf", { ...exportBody, theme: "executive", entitlement: "forged.token" }));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "premium_locked" });
  });
});

describe("GET /api/config", () => {
  it("keeps premium checkout off by default", async () => {
    expect(await (await configGet()).json()).toEqual({ premiumCheckout: false });
  });
});
