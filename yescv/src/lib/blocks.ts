/**
 * Turns the plain-text CV / letter the AI returns into simple blocks that the
 * preview, the PDF and the DOCX renderers all share, so every format shows the
 * same structure. The AI is asked to use "## " headings and "- " bullets; the
 * parser also copes with common variations (ALL CAPS headings, "•", "*").
 */
export type Block =
  | { kind: "name"; text: string }
  | { kind: "contact"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "spacer" };

const BULLET = /^\s*(?:[-•*▪·–]|\d+[.)])\s+/;
const MD_HEADING = /^\s*#{1,6}\s+/;

function stripInline(text: string): string {
  // Bold/italic markers carry no meaning once themed; drop them.
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1").trim();
}

function looksLikeHeading(line: string): boolean {
  const t = line.trim();
  if (t.length < 3 || t.length > 48 || /[.!?;,]$/.test(t)) return false;
  if (/:$/.test(t) && t.split(/\s+/).length <= 5) return true;
  const letters = t.replace(/[^\p{L}]/gu, "");
  return letters.length >= 3 && letters === letters.toLocaleUpperCase() && letters !== letters.toLocaleLowerCase();
}

export function parseBlocks(text: string, options: { withName?: boolean } = {}): Block[] {
  const blocks: Block[] = [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let i = 0;

  if (options.withName) {
    while (i < lines.length && !lines[i].trim()) i++;
    const first = lines[i]?.trim();
    if (first && first.length <= 80 && !BULLET.test(first)) {
      blocks.push({ kind: "name", text: stripInline(first.replace(MD_HEADING, "")) });
      i++;
      // Up to two short lines straight after the name are treated as contact/headline.
      for (let n = 0; n < 2 && i < lines.length; n++) {
        const line = lines[i].trim();
        if (!line || MD_HEADING.test(line) || looksLikeHeading(line) || BULLET.test(line) || line.length > 140) break;
        blocks.push({ kind: "contact", text: stripInline(line) });
        i++;
      }
    }
  }

  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (blocks.length && blocks[blocks.length - 1].kind !== "spacer") blocks.push({ kind: "spacer" });
      continue;
    }
    if (MD_HEADING.test(line)) blocks.push({ kind: "heading", text: stripInline(line.replace(MD_HEADING, "")).replace(/:$/, "") });
    else if (BULLET.test(line)) blocks.push({ kind: "bullet", text: stripInline(line.replace(BULLET, "")) });
    else if (looksLikeHeading(line)) blocks.push({ kind: "heading", text: stripInline(line).replace(/:$/, "") });
    else blocks.push({ kind: "paragraph", text: stripInline(line) });
  }
  while (blocks.length && blocks[blocks.length - 1].kind === "spacer") blocks.pop();
  // A spacer right before a heading only adds noise; headings bring their own space.
  return blocks.filter((b, idx) => !(b.kind === "spacer" && blocks[idx + 1]?.kind === "heading"));
}
