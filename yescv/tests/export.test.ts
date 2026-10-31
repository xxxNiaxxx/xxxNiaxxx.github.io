import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { contentDisposition, exportBlocks, exportFilename } from "@/lib/export/common";
import { renderDocx } from "@/lib/export/docx";
import { renderPdf } from "@/lib/export/pdf";
import { allThemes } from "@/lib/themes";
import { greekCv, readZipText } from "./helpers";

const letter = "Αξιότιμη κυρία, κύριε,\n\nΜε ιδιαίτερο ενδιαφέρον υποβάλλω την αίτησή μου. Größe, niño, garçon.\n\nΜε εκτίμηση,\nΜαρία";

function hasPdftotext(): boolean {
  try { execFileSync("pdftotext", ["-v"], { stdio: "ignore" }); return true; } catch { return false; }
}

describe("filenames", () => {
  it("are built from enums and the date only", () => {
    expect(exportFilename("letter", "modern", "pdf", new Date("2026-10-29T10:00:00Z"))).toBe("yescv-cover-letter-modern-2026-10-29.pdf");
    expect(contentDisposition('evil"\r\nname.pdf')).toBe('attachment; filename="evil___name.pdf"');
  });
});

describe("PDF export", () => {
  it.each(allThemes)("renders a Greek CV in the %s theme", async (theme) => {
    const bytes = await renderPdf(exportBlocks({ document: "cv", cv: greekCv, coverLetter: letter }), theme, { title: "Curriculum Vitae", language: "el" });
    expect(Buffer.from(bytes.subarray(0, 5)).toString()).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getTitle()).toBe("Curriculum Vitae");
    expect(doc.getPageCount()).toBe(1);
  });

  it("keeps Greek, German, Spanish and French characters as real text", async () => {
    const bytes = await renderPdf(exportBlocks({ document: "letter", cv: greekCv, coverLetter: letter }), "classic", { title: "Cover letter", language: "el" });
    if (!hasPdftotext()) return; // optional extra check where poppler is installed
    const dir = mkdtempSync(path.join(tmpdir(), "yescv-"));
    const file = path.join(dir, "letter.pdf");
    writeFileSync(file, bytes);
    const text = execFileSync("pdftotext", [file, "-"]).toString("utf8");
    for (const word of ["Μαρία Παπαδοπούλου", "Αξιότιμη", "Größe", "niño", "garçon"]) expect(text).toContain(word);
  });

  it("flows long content onto more pages and survives emoji and long words", async () => {
    const long = `${greekCv}\n${Array.from({ length: 120 }, (_, i) => `- Γραμμή ${i} 🚀 ${"x".repeat(i % 7 === 0 ? 150 : 5)}`).join("\n")}`;
    const bytes = await renderPdf(exportBlocks({ document: "cv", cv: long, coverLetter: letter }), "creative", { title: "CV", language: "el" });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1);
  });
});

describe("Europass-style theme", () => {
  it("puts section titles in a left column next to their content (PDF)", async () => {
    const bytes = await renderPdf(exportBlocks({ document: "cv", cv: greekCv, coverLetter: letter }), "europass", { title: "CV", language: "el" });
    if (!hasPdftotext()) return;
    const dir = mkdtempSync(path.join(tmpdir(), "yescv-"));
    const file = path.join(dir, "cv.pdf");
    writeFileSync(file, bytes);
    const lines = execFileSync("pdftotext", ["-layout", file, "-"]).toString("utf8").split("\n");
    expect(lines.find((l) => l.includes("Εμπειρία"))).toMatch(/Εμπειρία\s+•\s+Υπεύθυνη/);
    expect(lines.find((l) => l.includes("Εκπαίδευση"))).toMatch(/Εκπαίδευση\s+Πτυχίο/);
  });
  it("uses a two-column table in Word", async () => {
    const xml = readZipText(await renderDocx(exportBlocks({ document: "cv", cv: greekCv, coverLetter: letter }), "europass", { title: "CV", language: "el" }), "word/document.xml")!;
    expect(xml).toContain("<w:tbl>");
    expect(xml.match(/<w:tr>/g)).toHaveLength(3); // Εμπειρία, Εκπαίδευση, Δεξιότητες
    expect(xml.indexOf("Εμπειρία")).toBeLessThan(xml.indexOf("Ξενοδοχείο Ακρόπολις"));
  });
  it("keeps the cover letter full width", async () => {
    const xml = readZipText(await renderDocx(exportBlocks({ document: "letter", cv: greekCv, coverLetter: letter }), "europass", { title: "Letter", language: "el" }), "word/document.xml")!;
    expect(xml).not.toContain("<w:tbl>");
  });
});

describe("DOCX export", () => {
  it.each(allThemes)("writes Greek text and the theme font in the %s theme", async (theme) => {
    const buffer = await renderDocx(exportBlocks({ document: "cv", cv: greekCv, coverLetter: letter }), theme, { title: "CV", language: "el" });
    const xml = readZipText(buffer, "word/document.xml");
    expect(xml).toContain("Μαρία Παπαδοπούλου");
    expect(xml).toContain("Größe, Straße");
    expect(xml).toMatch(/w:ascii="(Georgia|Calibri|Arial|Cambria|Segoe UI)"/);
  });

  it("uses the CV name as letterhead for the cover letter", async () => {
    const buffer = await renderDocx(exportBlocks({ document: "letter", cv: greekCv, coverLetter: letter }), "modern", { title: "Cover letter", language: "el" });
    const xml = readZipText(buffer, "word/document.xml")!;
    expect(xml.indexOf("Μαρία Παπαδοπούλου")).toBeLessThan(xml.indexOf("Αξιότιμη"));
    expect(xml).not.toContain("Εμπειρία");
  });
});
