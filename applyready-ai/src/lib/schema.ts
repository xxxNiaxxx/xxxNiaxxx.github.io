import { z } from "zod";
import { languages } from "./languages";
import { allThemes } from "./themes";

export const LIMITS = {
  cvMin: 50,
  cvMax: 18_000,
  jobMin: 40,
  jobMax: 12_000,
  revisionMax: 1_500,
  letterMax: 8_000,
  gapMax: 500,
  gapsMax: 30,
  strengthsMax: 5,
  interviewMax: 6,
} as const;

/** Removes control characters (keeps newlines and tabs) that have no place in a CV. */
export function cleanText(value: string): string {
  return value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

const text = (min: number, max: number) => z.string().transform(cleanText).pipe(z.string().trim().min(min).max(max));

export const resultSchema = z.object({
  cv: text(LIMITS.cvMin, LIMITS.cvMax),
  coverLetter: text(20, LIMITS.letterMax),
  gaps: z.array(text(1, LIMITS.gapMax)).max(LIMITS.gapsMax),
  /** Why the person fits this job, each point backed by something in their CV. */
  strengths: z.array(z.object({ strength: text(1, 200), evidence: text(0, 300) })).max(LIMITS.strengthsMax).default([]),
  /** Likely interview questions with honest answers built from the person's real experience. */
  interview: z.array(z.object({ question: text(1, 300), answer: text(1, 900) })).max(LIMITS.interviewMax).default([]),
});
export type ApplicationResult = z.infer<typeof resultSchema>;

export const requestSchema = z.object({
  cvText: text(LIMITS.cvMin, LIMITS.cvMax),
  jobText: text(LIMITS.jobMin, LIMITS.jobMax),
  language: z.enum(languages),
  theme: z.enum(allThemes),
  revision: z.string().transform(cleanText).pipe(z.string().trim().max(LIMITS.revisionMax)).optional().default(""),
  previous: resultSchema.optional(),
}).refine((r) => !r.revision || r.previous, { message: "A revision needs a previous result.", path: ["previous"] });
export type ApplicationRequest = z.infer<typeof requestSchema>;

export const exportSchema = z.object({
  document: z.enum(["cv", "letter"]),
  theme: z.enum(allThemes),
  language: z.enum(languages),
  cv: text(1, LIMITS.cvMax),
  coverLetter: text(1, LIMITS.letterMax),
  entitlement: z.string().max(2_000).optional(),
});
export type ExportRequest = z.infer<typeof exportSchema>;

/** Largest image the server accepts after the browser has shrunk it (base64 adds ~33 %). */
export const MAX_IMAGE_BYTES = 3_000_000;

export const extractSchema = z.object({
  kind: z.enum(["cv", "job"]),
  image: z.string().max(Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 40).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/),
});
export type ExtractRequest = z.infer<typeof extractSchema>;

/** Checks the decoded bytes really are the image type the data URL claims. */
export function imageMatchesType(dataUrl: string): boolean {
  const match = /^data:image\/(png|jpeg|webp);base64,(.*)$/.exec(dataUrl);
  if (!match) return false;
  const bytes = Buffer.from(match[2].slice(0, 32), "base64");
  if (match[1] === "png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (match[1] === "jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP";
}
