import type { Benefit, Procedure } from '@/types/models';
import { categoryLabels } from './labels';

/** Lowercase and strip Greek/Latin diacritics so «Παιδί» matches «παιδι». */
export function normalizeGreek(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ς/g, 'σ')
    .trim();
}

const STOP_WORDS = new Set(['τι', 'πωσ', 'να', 'και', 'το', 'τα', 'η', 'ο', 'οι', 'σε', 'για', 'με', 'μου', 'εχω', 'ενα', 'μια', 'ωσ', 'απο', 'την', 'τη', 'τον', 'στο', 'στη', 'στην', 'υπαρχουν', 'κανω', 'ποια', 'ποιο']);

function tokens(query: string): string[] {
  return normalizeGreek(query)
    .split(/[^a-z0-9α-ω]+/i)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
}

/** Prefix-tolerant match so «ανεργοσ» matches «ανεργια» and «παιδια» matches «παιδι». */
function tokenMatches(token: string, haystack: string): boolean {
  if (haystack.includes(token)) return true;
  const stem = token.slice(0, Math.max(4, token.length - 2));
  return stem.length >= 4 && haystack.includes(stem);
}

function score(query: string, fields: string[]): number {
  const toks = tokens(query);
  if (toks.length === 0) return 0;
  const haystack = normalizeGreek(fields.join(' '));
  return toks.reduce((acc, t) => acc + (tokenMatches(t, haystack) ? 1 : 0), 0);
}

export type SearchResult =
  | { kind: 'benefit'; item: Benefit; score: number }
  | { kind: 'procedure'; item: Procedure; score: number };

export function searchContent(query: string, benefits: Benefit[], procedures: Procedure[]): SearchResult[] {
  const results: SearchResult[] = [];
  for (const b of benefits) {
    const s = score(query, [b.title, b.summary, categoryLabels[b.category], ...b.keywords]);
    if (s > 0) results.push({ kind: 'benefit', item: b, score: s });
  }
  for (const p of procedures) {
    const s = score(query, [p.title, p.description, categoryLabels[p.category], ...p.keywords]);
    if (s > 0) results.push({ kind: 'procedure', item: p, score: s });
  }
  return results.sort((a, b) => b.score - a.score);
}
