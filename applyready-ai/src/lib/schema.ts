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
