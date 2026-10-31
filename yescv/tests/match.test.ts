import { describe, expect, it } from "vitest";
import { jobKeywords, matchScore, sameWord } from "@/lib/match";

const greekJob = "Ζητείται Υπεύθυνος/η Υποδοχής για ξενοδοχείο 5 αστέρων. Απαραίτητα: εμπειρία σε ξενοδοχεία, γνώση Opera PMS, άριστα Αγγλικά και Γερμανικά, ικανότητα διοίκησης ομάδας, εξυπηρέτηση πελατών.";
const greekCv = "Μαρία Παπαδοπούλου\n## Εμπειρία\n- Υπεύθυνη εξυπηρέτησης πελατών, Ξενοδοχείο Ακρόπολις\n- Συντονισμός ομάδας 6 ατόμων\n## Γλώσσες\nΑγγλικά, Γερμανικά";

describe("sameWord", () => {
  it("matches word forms but not different words", () => {
    expect(sameWord("ξενοδοχειο", "ξενοδοχειων")).toBe(true);
    expect(sameWord("management", "manager")).toBe(true);
    expect(sameWord("java", "javascript")).toBe(false);
    expect(sameWord("excel", "excellent")).toBe(false);
    expect(sameWord("c++", "c#")).toBe(false);
  });
});

describe("jobKeywords", () => {
  it("drops filler words, merges variants and ranks repeated words first", () => {
    const words = jobKeywords(greekJob).map((k) => k.word);
    expect(words[0]).toBe("ξενοδοχείο"); // ξενοδοχείο + ξενοδοχεία
    expect(words).toContain("Opera");
    expect(words).toContain("PMS");
    for (const filler of ["Ζητείται", "Απαραίτητα", "εμπειρία", "γνώση", "άριστα", "ικανότητα", "και", "για"]) expect(words).not.toContain(filler);
  });
  it("keeps tech terms and acronyms", () => {
    const words = jobKeywords("Experience with Node.js, C++ and C#. Knowledge of SQL, HR and AI tools.").map((k) => k.word);
    expect(words).toEqual(expect.arrayContaining(["Node.js", "C++", "C#", "SQL", "HR", "AI"]));
  });
});

describe("matchScore", () => {
  it("scores a Greek CV against a Greek ad, ignoring accents and endings", () => {
    const result = matchScore(greekCv, greekJob);
    expect(result.comparable).toBe(true);
    if (!result.comparable) return;
    expect(result.matched).toEqual(expect.arrayContaining(["ξενοδοχείο", "Υπεύθυνος", "Αγγλικά", "Γερμανικά", "εξυπηρέτηση", "πελατών"]));
    expect(result.missing).toEqual(expect.arrayContaining(["Opera", "PMS", "διοίκησης"]));
    expect(result.score).toBeGreaterThan(40);
    expect(result.score).toBeLessThan(80);
  });
  it("goes up when the CV uses the ad's words", () => {
    const before = matchScore(greekCv, greekJob);
    const after = matchScore(`${greekCv}\n- Opera PMS`, greekJob);
    expect(before.comparable && after.comparable && after.score > before.score).toBe(true);
  });
  it("refuses to compare a Greek CV with an English ad", () => {
    expect(matchScore(greekCv, "We need a front office manager with Opera PMS, German and customer service skills.")).toEqual({ comparable: false });
  });
  it("is 100 when every keyword is present", () => {
    const job = "Front office manager: Opera PMS, German, customer service.";
    expect(matchScore("Front office manager. Opera PMS. German. Customer service.", job)).toMatchObject({ comparable: true, score: 100 });
  });
});
