import { parseBlocks, type Block } from "../blocks";
import type { ExportRequest } from "../schema";

/** Built only from validated enum values and the date: never from user text. */
export function exportFilename(document: ExportRequest["document"], theme: ExportRequest["theme"], ext: "pdf" | "docx", now = new Date()): string {
  const kind = document === "cv" ? "cv" : "cover-letter";
  return `applyready-${kind}-${theme}-${now.toISOString().slice(0, 10)}.${ext}`;
}

export function contentDisposition(filename: string): string {
  return `attachment; filename="${filename.replace(/[^A-Za-z0-9._-]/g, "_")}"`;
}

/**
 * Blocks for one export. The cover letter reuses the CV's name and contact
 * lines as its letterhead, so both documents match.
 */
export function exportBlocks(input: Pick<ExportRequest, "document" | "cv" | "coverLetter">): Block[] {
  const cvBlocks = parseBlocks(input.cv, { withName: true });
  if (input.document === "cv") return cvBlocks;
  const letterhead = cvBlocks.filter((b, i) => i < 3 && (b.kind === "name" || b.kind === "contact"));
  const letter = input.coverLetter
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line): Block => (line.trim() ? { kind: "paragraph", text: line.trim() } : { kind: "spacer" }));
  return [...letterhead, ...letter];
}
