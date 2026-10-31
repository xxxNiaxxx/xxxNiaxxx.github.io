import { describe, expect, it } from "vitest";
import { parseBlocks } from "@/lib/blocks";
import { greekCv } from "./helpers";

describe("parseBlocks", () => {
  it("finds name, contact, headings and bullets in a Greek CV", () => {
    const blocks = parseBlocks(greekCv, { withName: true });
    expect(blocks[0]).toEqual({ kind: "name", text: "Μαρία Παπαδοπούλου" });
    expect(blocks[1]).toEqual({ kind: "contact", text: "Αθήνα · maria@example.com" });
    expect(blocks.filter((b) => b.kind === "heading").map((b) => "text" in b && b.text)).toEqual(["Εμπειρία", "Εκπαίδευση", "Δεξιότητες"]);
    expect(blocks.filter((b) => b.kind === "bullet")).toHaveLength(4);
  });

  it("treats ALL CAPS and colon lines as headings and strips markdown emphasis", () => {
    const blocks = parseBlocks("BERUFSERFAHRUNG\n• **Leitung** des Teams\nSkills:\n* Excel");
    expect(blocks).toEqual([
      { kind: "heading", text: "BERUFSERFAHRUNG" },
      { kind: "bullet", text: "Leitung des Teams" },
      { kind: "heading", text: "Skills" },
      { kind: "bullet", text: "Excel" },
    ]);
  });

  it("does not turn a normal sentence into a heading", () => {
    expect(parseBlocks("I led a team of six people.")[0].kind).toBe("paragraph");
  });
});
