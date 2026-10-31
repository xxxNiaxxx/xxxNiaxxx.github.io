import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import type { Block } from "../blocks";
import { themeSpecs, type Theme, type ThemeSpec } from "../themes";

/**
 * Real PDF files, built with pdf-lib and the bundled DejaVu fonts, which cover
 * Latin (incl. accents, ß, ñ, ç), Greek and Cyrillic. The fonts are subset, so
 * only the glyphs used end up in the file.
 */

const FONT_FILES = {
  sans: { regular: "DejaVuSans.ttf", bold: "DejaVuSans-Bold.ttf" },
  serif: { regular: "DejaVuSerif.ttf", bold: "DejaVuSerif-Bold.ttf" },
} as const;

const fontCache = new Map<string, Promise<Buffer>>();
function fontBytes(file: string): Promise<Buffer> {
  let bytes = fontCache.get(file);
  if (!bytes) {
    bytes = readFile(path.join(process.cwd(), "fonts", file));
    fontCache.set(file, bytes);
    bytes.catch(() => fontCache.delete(file));
  }
  return bytes;
}

const PAGE = { width: 595.28, height: 841.89 }; // A4
const MARGIN = 54;
// "columns" theme: section titles in a left column, content to the right.
const LABEL_WIDTH = 128;
const COLUMN_GAP = 16;

function color(hex: string): RGB {
  const n = Number.parseInt(hex, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

type Ctx = {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  left: number;
  right: number;
  regular: PDFFont;
  bold: PDFFont;
  spec: ThemeSpec;
  charset: Set<number>;
};

/** Replaces characters the font cannot draw (e.g. emoji) instead of failing. */
function sanitise(ctx: Ctx, text: string): string {
  let out = "";
  for (const ch of text.replace(/\t/g, "    ")) {
    const code = ch.codePointAt(0)!;
    out += ctx.charset.has(code) || code === 32 ? ch : code < 32 ? "" : "?";
  }
  return out;
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/ +/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    // A single word longer than the line (URLs) is broken by characters.
    let rest = word;
    while (font.widthOfTextAtSize(rest, size) > width && rest.length > 1) {
      let cut = rest.length - 1;
      while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > width) cut--;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    line = rest;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function decorate(ctx: Ctx) {
  if (ctx.spec.header === "sidebar") {
    ctx.page.drawRectangle({ x: 0, y: 0, width: 16, height: PAGE.height, color: color(ctx.spec.accent) });
  }
}

function newPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([PAGE.width, PAGE.height]);
  ctx.y = PAGE.height - MARGIN;
  decorate(ctx);
}

function ensure(ctx: Ctx, height: number) {
  if (ctx.y - height < MARGIN) newPage(ctx);
}

function drawLines(ctx: Ctx, text: string, opts: { font: PDFFont; size: number; color: RGB; indent?: number; align?: "left" | "center" | "right"; lineHeight?: number }) {
  const x0 = ctx.left + (opts.indent ?? 0);
  const width = ctx.right - x0;
  const lineHeight = opts.size * (opts.lineHeight ?? 1.4);
  for (const line of wrap(sanitise(ctx, text), opts.font, opts.size, width)) {
    ensure(ctx, lineHeight);
    ctx.y -= lineHeight;
    const lineWidth = opts.font.widthOfTextAtSize(line, opts.size);
    const x = opts.align === "center" ? x0 + (width - lineWidth) / 2 : opts.align === "right" ? ctx.right - lineWidth : x0;
    ctx.page.drawText(line, { x, y: ctx.y + opts.size * 0.3, size: opts.size, font: opts.font, color: opts.color });
  }
}

function drawHeader(ctx: Ctx, name: string | undefined, contacts: string[]) {
  const { spec } = ctx;
  if (!name) return;
  if (spec.header === "band") {
    const bandColor = color(spec.band);
    const bandHeight = 58 + contacts.length * 15;
    ctx.page.drawRectangle({ x: 0, y: PAGE.height - bandHeight, width: PAGE.width, height: bandHeight, color: bandColor });
    if (spec.headingRule) {
      ctx.page.drawRectangle({ x: 0, y: PAGE.height - bandHeight - 4, width: PAGE.width, height: 4, color: color(spec.accent) });
    }
    ctx.y = PAGE.height - 18;
    drawLines(ctx, name, { font: ctx.bold, size: spec.nameSize, color: rgb(1, 1, 1), lineHeight: 1.3 });
    for (const c of contacts) drawLines(ctx, c, { font: ctx.regular, size: spec.bodySize, color: rgb(0.92, 0.94, 1) });
    ctx.y = PAGE.height - bandHeight - 22;
    return;
  }
  const center = spec.header === "centered";
  drawLines(ctx, name, {
    font: spec.header === "plain" ? ctx.regular : ctx.bold,
    size: spec.nameSize,
    color: color(spec.header === "sidebar" || spec.header === "columns" ? spec.accent : spec.ink),
    align: center ? "center" : "left",
    lineHeight: 1.25,
  });
  for (const c of contacts) drawLines(ctx, c, { font: ctx.regular, size: spec.bodySize - 0.5, color: color(spec.muted), align: center ? "center" : "left" });
  ctx.y -= 8;
  if (center || spec.header === "columns") {
    ctx.page.drawLine({ start: { x: ctx.left, y: ctx.y }, end: { x: ctx.right, y: ctx.y }, thickness: center ? 1.2 : 1.5, color: color(center ? spec.ink : spec.accent) });
    ctx.y -= 6;
  }
}

export async function renderPdf(blocks: Block[], theme: Theme, meta: { title: string; language: string }): Promise<Uint8Array> {
  const spec = themeSpecs[theme];
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(meta.title);
  doc.setLanguage(meta.language);
  doc.setCreator("YesCV");
  doc.setProducer("YesCV");
  const files = FONT_FILES[spec.family];
  const [regularBytes, boldBytes] = await Promise.all([fontBytes(files.regular), fontBytes(files.bold)]);
  const regular = await doc.embedFont(regularBytes, { subset: true });
  const bold = await doc.embedFont(boldBytes, { subset: true });
  const charset = new Set([...regular.getCharacterSet()].filter((c) => bold.getCharacterSet().includes(c)));

  const left = MARGIN + (spec.header === "sidebar" ? 10 : 0);
  const ctx = { doc, y: 0, left, right: PAGE.width - MARGIN, regular, bold, spec, charset } as Ctx;
  newPage(ctx);

  const name = blocks.find((b) => b.kind === "name");
  const contacts = blocks.filter((b): b is Extract<Block, { kind: "contact" }> => b.kind === "contact").map((b) => b.text);
  drawHeader(ctx, name?.kind === "name" ? name.text : undefined, contacts);

  const ink = color(spec.ink);
  const columns = spec.header === "columns";
  let label: { page: PDFPage; bottom: number } | undefined;
  for (const block of blocks) {
    switch (block.kind) {
      case "heading": {
        if (columns) {
          const size = spec.bodySize + 1;
          // Start below the previous section's title if that title ran longer than its content.
          if (label?.page === ctx.page) ctx.y = Math.min(ctx.y, label.bottom);
          ctx.left = MARGIN;
          ctx.right = MARGIN + LABEL_WIDTH;
          ensure(ctx, size * 3.2);
          ctx.y -= size * 0.9;
          const top = ctx.y;
          drawLines(ctx, block.text, { font: ctx.bold, size, color: color(spec.accent), align: "right", lineHeight: 1.3 });
          label = { page: ctx.page, bottom: ctx.y };
          ctx.y = top;
          ctx.left = MARGIN + LABEL_WIDTH + COLUMN_GAP;
          ctx.right = PAGE.width - MARGIN;
          break;
        }
        const size = spec.bodySize + (spec.header === "plain" ? 1 : 2.5);
        ensure(ctx, size * 3.2); // keep a heading with at least one line after it
        ctx.y -= size * 0.7;
        const text = spec.headingCase === "upper" ? block.text.toLocaleUpperCase(meta.language) : block.text;
        drawLines(ctx, text, { font: ctx.bold, size, color: color(spec.header === "plain" ? spec.muted : spec.accent) });
        if (spec.headingRule) {
          ctx.y -= 3;
          ctx.page.drawLine({ start: { x: ctx.left, y: ctx.y }, end: { x: ctx.right, y: ctx.y }, thickness: 0.6, color: color(spec.accent) });
        }
        ctx.y -= 3;
        break;
      }
      case "bullet": {
        // Make room for the first line first, so the bullet sits beside it on the same page.
        ensure(ctx, spec.bodySize * 1.4);
        const page = ctx.page;
        const firstLineY = ctx.y - spec.bodySize * 1.4;
        drawLines(ctx, block.text, { font: ctx.regular, size: spec.bodySize, color: ink, indent: 12 });
        page.drawText("•", { x: ctx.left + 2, y: firstLineY + spec.bodySize * 0.3, size: spec.bodySize, font: ctx.regular, color: color(spec.accent) });
        break;
      }
      case "paragraph":
        drawLines(ctx, block.text, { font: ctx.regular, size: spec.bodySize, color: ink });
        break;
      case "spacer":
        ctx.y -= spec.bodySize * 0.7;
        break;
    }
  }
  return doc.save();
}
