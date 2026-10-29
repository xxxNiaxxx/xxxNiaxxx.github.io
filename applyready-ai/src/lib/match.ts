/**
 * Keyword match between a CV and a job ad, the way ATS scanners (Jobscan,
 * Teal, Rezi) score it: the important words of the ad, and how many of them
 * the CV contains. Runs in the browser, costs no AI call, and works for all
 * five languages (accents and Greek tonos are ignored, word endings are
 * matched loosely so "ξενοδοχείο" ~ "ξενοδοχείου" and "manager" ~ "management").
 *
 * It is an approximation by design: it tells the user which words of the ad
 * the CV does not use, not whether they are a good candidate.
 */

const STOPWORDS = new Set(`
a an the and or but if then than so as at by for from in into of on onto to with without within about above after before
over under up down out off again further is are was were be been being am do does did doing have has had having
i me my we our ours you your yours he him his she her it its they them their this that these those who whom which what
when where why how all any both each few more most other some such no nor not only own same too very can will just
should could would may might must shall also etc per via e.g i.e us use using used new well good great strong
able ability work working works job jobs role roles position positions candidate candidates company team teams our
looking seeking join hiring offer offers offering opportunity opportunities apply application applications including
include includes required requirements require requires requirement preferred plus years year experience experienced
skills skill knowledge excellent good level minimum least day days time full part based within environment responsible
responsibilities duties tasks ensure provide support help make within across one two three first new
και ή αλλά αν τότε ότι όπως ως σε στο στη στην στον στους στις στα το τα τη την της του των τον τους τις οι ο η ένα
ένας μία μια ενός μιας για με από προς χωρίς κατά μετά πριν πάνω κάτω μέσα έξω είναι είμαστε είστε ήταν θα να δεν
μη μην που πού ποιος ποια ποιο αυτός αυτή αυτό αυτοί αυτές αυτά εμείς εσείς σας μας μου σου τους ή επίσης έως
όλα όλοι όλες κάθε πολύ πιο μόνο ίδιο έχει έχουν έχουμε έχετε ζητείται ζητούνται ζητάμε αναζητούμε αναζητεί εταιρεία
εταιρείας θέση θέσης θέσεις υποψήφιος υποψήφια υποψήφιοι υποψηφίων προσόντα απαραίτητα απαραίτητη απαραίτητο
επιθυμητά επιθυμητή επιθυμητό προϋπόθεση εμπειρία εμπειρίας γνώση γνώσεις γνώσης καλή καλές καλός άριστη άριστες
ικανότητα ικανότητες δυνατότητα άριστα άριστος καλά καλή καλό πολύ πάρα νέα νέο νέος προσφέρουμε προσφέρεται παροχές αποστολή βιογραφικού βιογραφικό σημείωμα ομάδα
ομάδας εργασία εργασίας χρόνια έτη ετών τουλάχιστον πλήρης μερική απασχόληση ευθύνες αρμοδιότητες καθήκοντα
el la los las un una unos unas y o pero si que como de del al en con sin por para sobre entre hasta desde es son
ser estar está están fue era ha han hay se su sus nuestro nuestra nuestros tu tus le les lo muy más menos también
buscamos ofrecemos empresa puesto puestos candidato candidata requisitos experiencia conocimientos años equipo trabajo
le la les un une des et ou mais si que qui quoi comme de du au aux en dans avec sans par pour sur entre jusqu est
sont être avoir a ont été notre nos votre vos leur leurs ce cette ces il elle ils elles nous vous très plus moins
aussi nous recherchons recherche offrons entreprise poste postes candidat candidate profil expérience connaissances
ans équipe travail missions
der die das den dem des ein eine einer eines einem einen und oder aber wenn dann als wie zu zum zur von vom mit ohne
für auf an am im in aus bei nach vor über unter zwischen bis ist sind war waren sein haben hat hatte wird werden
wir sie ihr ihre ihren ihrem unser unsere du dein sehr mehr weniger auch nicht kein keine suchen bieten unternehmen
stelle stellen bewerber bewerberin bewerbung erfahrung kenntnisse jahre jahren team arbeit aufgaben profil
`.split(/\s+/).filter(Boolean).map((w) => normalise(w)));

function normalise(word: string): string {
  return word.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/ς/g, "σ");
}

// Words, plus tech terms with symbols: C++, C#, Node.js, front-end, ISO-9001.
// "/" splits ("Υπεύθυνος/η", "Excel/Word").
const TOKEN = /[\p{L}\p{N}](?:[\p{L}\p{N}+#.\-]*[\p{L}\p{N}+#])?/gu;

type Token = { norm: string; display: string; index: number };

function tokens(text: string): Token[] {
  const out: Token[] = [];
  for (const match of text.matchAll(TOKEN)) {
    const display = match[0];
    const norm = normalise(display);
    if (/^[\d.,\-]+$/.test(norm)) continue; // plain numbers and dates
    const acronym = display.length === 2 && display === display.toUpperCase() && /\p{L}{2}/u.test(display);
    const tech = /[+#]/.test(display); // C#, C++, F#
    if (norm.length < 3 && !acronym && !tech) continue;
    if (STOPWORDS.has(norm)) continue;
    out.push({ norm, display, index: match.index ?? 0 });
  }
  return out;
}

function commonPrefix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/** Same word in a different form? Loose enough for Greek/German endings, strict enough to keep java ≠ javascript. */
export function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  if (/[^\p{L}]/u.test(a) || /[^\p{L}]/u.test(b)) return false; // tech terms match exactly
  const min = Math.min(a.length, b.length);
  if (min < 4) return false;
  const prefix = commonPrefix(a, b);
  return prefix >= Math.max(4, min - 3) && prefix >= Math.max(a.length, b.length) * 0.6;
}

export type Keyword = { word: string; weight: number };

/** The ad's most frequent meaningful words, variants merged, best first. */
export function jobKeywords(jobText: string, limit = 25): Keyword[] {
  const groups: { norm: string; display: string; weight: number; first: number }[] = [];
  for (const token of tokens(jobText)) {
    const group = groups.find((g) => sameWord(g.norm, token.norm));
    if (group) group.weight += 1;
    else groups.push({ norm: token.norm, display: token.display, weight: 1, first: token.index });
  }
  return groups
    .map((g) => ({ ...g, weight: Math.min(g.weight, 3) })) // repeated words matter, but not endlessly
    .sort((a, b) => b.weight - a.weight || a.first - b.first)
    .slice(0, limit)
    .map((g) => ({ word: g.display, weight: g.weight }));
}

function greekShare(text: string): number {
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  const greek = text.match(/[Ͱ-Ͽἀ-῿]/g)?.length ?? 0;
  return letters ? greek / letters : 0;
}

export type MatchResult =
  | { comparable: true; score: number; matched: string[]; missing: string[] }
  | { comparable: false };

export function matchScore(cvText: string, jobText: string): MatchResult {
  // A Greek CV against an English ad (or the other way round) shares no words; a score would mislead.
  if (Math.abs(greekShare(cvText) - greekShare(jobText)) > 0.5) return { comparable: false };
  const keywords = jobKeywords(jobText);
  if (!keywords.length) return { comparable: false };
  const cvWords = [...new Set(tokens(cvText).map((t) => t.norm))];
  const matched: string[] = [];
  const missing: string[] = [];
  let got = 0;
  let total = 0;
  for (const keyword of keywords) {
    const norm = normalise(keyword.word);
    total += keyword.weight;
    if (cvWords.some((w) => sameWord(w, norm))) {
      got += keyword.weight;
      matched.push(keyword.word);
    } else {
      missing.push(keyword.word);
    }
  }
  return { comparable: true, score: Math.round((100 * got) / total), matched, missing };
}
