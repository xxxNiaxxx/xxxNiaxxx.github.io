import { extractText, getDocumentProxy } from "unpdf";
import { AppError } from "./errors";
import { cleanText } from "./schema";
import { readZipEntry } from "./zip";

/**
 * Text extraction from an uploaded CV file: PDF (text layer), Word .docx or
 * plain text. Runs in memory; the file is never stored. Scanned PDFs have no
 * text layer, so they end in "file_no_text" and the user is pointed to the
 * screenshot import instead.
 */
export type ImportKind = "pdf" | "docx" | "txt";

export const MAX_IMPORT_BYTES = 4_000_000; // under Vercel's 4.5 MB request limit

/** Decides the type from the bytes (not the file name or the browser's claim). */
export function detectKind(bytes: Buffer, filename: string): ImportKind | null {
  if (bytes.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  if (bytes.readUInt32LE(0) === 0x04034b50 && bytes.includes(Buffer.from("word/document.xml"))) return "docx";
  if (/\.(txt|text|md)$/i.test(filename) && !bytes.includes(0)) {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return "txt";
    } catch {
      return null;
    }
  }
  return null;
}

function decodeXml(text: string): string {
  return text
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

/** Paragraphs from word/document.xml; headings become "## ", list items "- ". */
export function docxXmlToText(xml: string): string {
  const lines: string[] = [];
  for (const [, attrs, body] of xml.matchAll(/<w:p(\s[^>]*)?>([\s\S]*?)<\/w:p>/g)) {
    void attrs;
    const style = /<w:pStyle w:val="([^"]+)"/.exec(body)?.[1] ?? "";
    let text = "";
    for (const [token, , inner] of body.matchAll(/<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>|<w:cr\/>/g)) {
      if (token.startsWith("<w:tab")) text += "\t";
      else if (token.startsWith("<w:br") || token.startsWith("<w:cr")) text += "\n";
      else text += decodeXml(inner ?? "");
    }
    text = text.trim();
    if (!text) { lines.push(""); continue; }
    if (/^(Heading|Title|Subtitle)|^(berschrift|Titre)/i.test(style)) lines.push(`## ${text}`);
    else if (body.includes("<w:numPr>") || /List/i.test(style)) lines.push(`- ${text}`);
    else lines.push(text);
  }
  return lines.join("\n");
}

async function pdfToText(bytes: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: false });
  return (Array.isArray(text) ? text : [text]).join("\n\n");
}

export async function extractFileText(bytes: Buffer, kind: ImportKind, maxChars: number): Promise<string> {
  let text: string;
  try {
    if (kind === "pdf") text = await pdfToText(bytes);
    else if (kind === "docx") {
      const xml = readZipEntry(bytes, "word/document.xml");
      if (!xml) throw new AppError("file_invalid");
      text = docxXmlToText(xml.toString("utf8"));
    } else text = bytes.toString("utf8").replace(/^﻿/, "");
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("file_invalid", kind); // encrypted or corrupt file
  }
  const cleaned = cleanText(text).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (cleaned.replace(/\s/g, "").length < 20) throw new AppError("file_no_text");
  return cleaned.slice(0, maxChars);
}
