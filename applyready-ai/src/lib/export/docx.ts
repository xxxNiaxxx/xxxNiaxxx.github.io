import { AlignmentType, BorderStyle, Document, Packer, Paragraph, ShadingType, TextRun, type IBorderOptions } from "docx";
import type { Block } from "../blocks";
import { themeSpecs, type Theme } from "../themes";

/** Real .docx files. Word stores text as Unicode, so Greek and accents need nothing special. */
export async function renderDocx(blocks: Block[], theme: Theme, meta: { title: string; language: string }): Promise<Buffer> {
  const spec = themeSpecs[theme];
  const half = (pt: number) => Math.round(pt * 2); // docx sizes are half-points
  const lang = { value: meta.language };
  const run = (text: string, extra: Partial<{ bold: boolean; color: string; size: number; allCaps: boolean }> = {}) =>
    new TextRun({ text, font: spec.docxFont, size: half(extra.size ?? spec.bodySize), color: extra.color ?? spec.ink, bold: extra.bold, allCaps: extra.allCaps, language: lang });
  const leftBar: IBorderOptions = { style: BorderStyle.SINGLE, size: 36, color: spec.accent, space: 8 };

  const band = spec.header === "band";
  const centered = spec.header === "centered";
  const sidebar = spec.header === "sidebar";
  const children: Paragraph[] = [];

  for (const block of blocks) {
    switch (block.kind) {
      case "name":
        children.push(new Paragraph({
          alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT,
          shading: band ? { type: ShadingType.CLEAR, fill: spec.band, color: "auto" } : undefined,
          border: sidebar ? { left: leftBar } : undefined,
          spacing: { after: 60 },
          children: [run(block.text, { bold: spec.header !== "plain", size: spec.nameSize, color: band ? "FFFFFF" : sidebar ? spec.accent : spec.ink })],
        }));
        break;
      case "contact": {
        const isLastContact = blocks[blocks.indexOf(block) + 1]?.kind !== "contact";
        children.push(new Paragraph({
          alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT,
          shading: band ? { type: ShadingType.CLEAR, fill: spec.band, color: "auto" } : undefined,
          border: centered && isLastContact
            ? { bottom: { style: BorderStyle.SINGLE, size: 12, color: spec.ink, space: 6 } }
            : band && spec.headingRule && isLastContact
              ? { bottom: { style: BorderStyle.SINGLE, size: 24, color: spec.accent, space: 2 } }
              : sidebar ? { left: leftBar } : undefined,
          spacing: { after: isLastContact ? 240 : 40 },
          children: [run(block.text, { color: band ? "EEF1FF" : spec.muted, size: spec.bodySize - 0.5 })],
        }));
        break;
      }
      case "heading":
        children.push(new Paragraph({
          keepNext: true,
          spacing: { before: 240, after: 80 },
          border: spec.headingRule ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: spec.accent, space: 2 } } : undefined,
          children: [run(block.text, {
            bold: true,
            allCaps: spec.headingCase === "upper",
            size: spec.bodySize + (spec.header === "plain" ? 1 : 2.5),
            color: spec.header === "plain" ? spec.muted : spec.accent,
          })],
        }));
        break;
      case "bullet":
        children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [run(block.text)] }));
        break;
      case "paragraph":
        children.push(new Paragraph({ spacing: { after: 60, line: 276 }, children: [run(block.text)] }));
        break;
      case "spacer":
        children.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
        break;
    }
  }

  const doc = new Document({
    title: meta.title,
    creator: "ApplyReady AI",
    styles: { default: { document: { run: { font: spec.docxFont, size: half(spec.bodySize), color: spec.ink, language: lang } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } },
      children,
    }],
  });
  return Packer.toBuffer(doc);
}
