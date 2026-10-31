import { describe, expect, it } from "vitest";
import { POST as importRoute } from "@/app/api/import/route";
import { exportBlocks } from "@/lib/export/common";
import { renderDocx } from "@/lib/export/docx";
import { renderPdf } from "@/lib/export/pdf";
import { detectKind, docxXmlToText, extractFileText } from "@/lib/import";
import { greekCv } from "./helpers";

const blocks = exportBlocks({ document: "cv", cv: greekCv, coverLetter: "x" });

function upload(bytes: Uint8Array | string, name: string): Request {
  const form = new FormData();
  form.append("file", new Blob([typeof bytes === "string" ? bytes : new Uint8Array(bytes)]), name);
  return new Request("http://localhost/api/import", { method: "POST", body: form, headers: { "x-forwarded-for": "203.0.113.9" } });
}

describe("detectKind", () => {
  it("trusts the bytes, not the file name", async () => {
    const pdf = Buffer.from(await renderPdf(blocks, "classic", { title: "CV", language: "el" }));
    expect(detectKind(pdf, "cv.txt")).toBe("pdf");
    expect(detectKind(await renderDocx(blocks, "modern", { title: "CV", language: "el" }), "cv.pdf")).toBe("docx");
    expect(detectKind(Buffer.from("Μαρία, Größe"), "cv.txt")).toBe("txt");
    expect(detectKind(Buffer.from([0xff, 0xfe, 0x00, 0x41]), "cv.txt")).toBeNull();
    expect(detectKind(Buffer.from("MZ\u0090\u0000binary"), "cv.exe")).toBeNull();
  });
});

describe("extractFileText", () => {
  it("reads a Greek Word file with headings and bullets", async () => {
    const docx = await renderDocx(blocks, "classic", { title: "CV", language: "el" });
    const text = await extractFileText(docx, "docx", 18_000);
    expect(text).toContain("Μαρία Παπαδοπούλου");
    expect(text).toContain("- Συντονισμός ομάδας 6 ατόμων");
    expect(text).toContain("Größe, Straße");
  });

  it("reads the text layer of a Greek PDF", async () => {
    const pdf = Buffer.from(await renderPdf(blocks, "modern", { title: "CV", language: "el" }));
    const text = await extractFileText(pdf, "pdf", 18_000);
    expect(text).toContain("Μαρία Παπαδοπούλου");
    expect(text).toContain("Ξενοδοχείο Ακρόπολις");
    expect(text).toContain("garçon");
  });

  it("maps Word heading styles and list paragraphs", () => {
    const xml = '<w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Εμπειρία</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/></w:numPr></w:pPr><w:r><w:t xml:space="preserve">Excel &amp; Word</w:t></w:r></w:p></w:body>';
    expect(docxXmlToText(xml)).toBe("## Εμπειρία\n- Excel & Word");
  });

  it("reports files without text and damaged files", async () => {
    await expect(extractFileText(Buffer.from("   \n  "), "txt", 100)).rejects.toMatchObject({ code: "file_no_text" });
    await expect(extractFileText(Buffer.from("%PDF-1.7 broken"), "pdf", 100)).rejects.toMatchObject({ code: "file_invalid" });
    await expect(extractFileText(Buffer.from("PK\u0003\u0004word/document.xml"), "docx", 100)).rejects.toMatchObject({ code: "file_invalid" });
  });
});

describe("POST /api/import", () => {
  it("returns the text of an uploaded DOCX", async () => {
    const docx = await renderDocx(blocks, "minimal", { title: "CV", language: "el" });
    const response = await importRoute(upload(docx, "cv.docx"));
    expect(response.status).toBe(200);
    expect((await response.json()).text).toContain("Μαρία Παπαδοπούλου");
  });
  it("rejects unsupported and missing files", async () => {
    expect(await (await importRoute(upload("MZ\u0000\u0000", "virus.exe"))).json()).toEqual({ error: "file_invalid" });
    const empty = new Request("http://localhost/api/import", { method: "POST", body: new FormData() });
    expect((await importRoute(empty)).status).toBe(400);
  });
  it("rejects oversized uploads", async () => {
    const response = await importRoute(upload(new Uint8Array(4_100_000), "big.pdf"));
    expect(response.status).toBe(413);
  });
});
