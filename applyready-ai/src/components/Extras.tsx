"use client";

import { useState } from "react";
import type { ErrorCode } from "@/lib/errors";
import type { copy } from "@/lib/i18n";
import type { Language } from "@/lib/languages";
import type { ApplicationResult, EmailsResult, LinkedinResult, PlanResult, PracticeResult } from "@/lib/schema";

type Copy = (typeof copy)["en"];
type Task = "emails" | "plan" | "linkedin";
export type AssistContext = { language: Language; cvText: string; jobText: string; result: ApplicationResult };
export type Post = (url: string, body: unknown) => Promise<Response>;

function CopyButton({ text, t }: { text: string; t: Copy }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="secondary small-btn" onClick={() => navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => undefined)}>
      {done ? t.copied : t.copy}
    </button>
  );
}

/** Emails, gap plan and LinkedIn profile, each generated only when asked for. */
export function Extras({ ctx, t, post, onError }: { ctx: AssistContext; t: Copy; post: Post; onError: (code: ErrorCode | unknown) => void }) {
  const [busy, setBusy] = useState<Task | null>(null);
  const [emails, setEmails] = useState<EmailsResult | null>(null);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [linkedin, setLinkedin] = useState<LinkedinResult | null>(null);

  async function run(task: Task) {
    if (busy) return;
    setBusy(task);
    try {
      const response = await post("/api/assist", { task, language: ctx.language, cvText: ctx.cvText, jobText: ctx.jobText, tailoredCv: ctx.result.cv, gaps: ctx.result.gaps });
      const { result } = (await response.json()) as { result: unknown };
      if (task === "emails") setEmails(result as EmailsResult);
      if (task === "plan") setPlan(result as PlanResult);
      if (task === "linkedin") setLinkedin(result as LinkedinResult);
    } catch (error) {
      onError(error);
    } finally {
      setBusy(null);
    }
  }

  const email = (label: string, e: EmailsResult["send"]) => (
    <div className="extra-item" key={label}>
      <div className="extra-head"><strong>{label}</strong><CopyButton text={`${t.subject}: ${e.subject}\n\n${e.body}`} t={t} /></div>
      <p className="small">{t.subject}: {e.subject}</p>
      <p className="pre">{e.body}</p>
    </div>
  );

  return (
    <div className="result-section">
      <h2>{t.extrasTitle}</h2>
      <p className="small">{t.extrasHint}</p>
      <div className="actions">
        <button type="button" className="secondary" disabled={Boolean(busy)} onClick={() => run("emails")}>{busy === "emails" ? t.working : t.emailsBtn}</button>
        {ctx.result.gaps.length > 0 && <button type="button" className="secondary" disabled={Boolean(busy)} onClick={() => run("plan")}>{busy === "plan" ? t.working : t.planBtn}</button>}
        <button type="button" className="secondary" disabled={Boolean(busy)} onClick={() => run("linkedin")}>{busy === "linkedin" ? t.working : t.linkedinBtn}</button>
      </div>
      {emails && <div className="extra">{email(t.emailSend, emails.send)}{email(t.emailFollowUp, emails.followUp)}{email(t.emailThanks, emails.thankYou)}</div>}
      {plan && (
        <div className="extra">
          {plan.plan.map((p, i) => (
            <div className="extra-item" key={i}>
              <strong>{p.gap}</strong>
              <ol>{p.steps.map((s, k) => <li key={k}>{s}</li>)}</ol>
            </div>
          ))}
          <div className="extra-item">
            <div className="extra-head"><strong>{t.planHonest}</strong><CopyButton text={plan.honestLine} t={t} /></div>
            <p className="pre">{plan.honestLine}</p>
          </div>
          <p className="small">{t.planNote}</p>
        </div>
      )}
      {linkedin && (
        <div className="extra">
          <div className="extra-item"><div className="extra-head"><strong>{t.linkedinHeadline}</strong><CopyButton text={linkedin.headline} t={t} /></div><p className="pre">{linkedin.headline}</p></div>
          <div className="extra-item"><div className="extra-head"><strong>{t.linkedinAbout}</strong><CopyButton text={linkedin.about} t={t} /></div><p className="pre">{linkedin.about}</p></div>
          {linkedin.skills.length > 0 && <div className="extra-item"><strong>{t.linkedinSkills}</strong><ul className="chips">{linkedin.skills.map((s) => <li key={s} className="kw kw-found">{s}</li>)}</ul></div>}
        </div>
      )}
    </div>
  );
}

/** Pick a likely question (or write one), answer it, get honest feedback. */
export function Practice({ ctx, t, post, onError }: { ctx: AssistContext; t: Copy; post: Post; onError: (code: ErrorCode | unknown) => void }) {
  const questions = ctx.result.interview.map((q) => q.question);
  const [choice, setChoice] = useState(questions.length ? "0" : "custom");
  const [custom, setCustom] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<PracticeResult | null>(null);
  const question = choice === "custom" ? custom.trim() : questions[Number(choice)] ?? "";

  async function submit() {
    if (busy || !question || !answer.trim()) return;
    setBusy(true);
    setFeedback(null);
    try {
      const response = await post("/api/assist", { task: "practice", language: ctx.language, cvText: ctx.cvText, jobText: ctx.jobText, tailoredCv: ctx.result.cv, gaps: ctx.result.gaps, question, answer });
      setFeedback(((await response.json()) as { result: PracticeResult }).result);
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form id="practice" className="result-section" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <h2>{t.practiceTitle}</h2>
      <p className="small">{t.practiceHint}</p>
      <label htmlFor="practice-q">{t.practiceQuestion}</label>
      <select id="practice-q" value={choice} onChange={(e) => { setChoice(e.target.value); setFeedback(null); }}>
        {questions.map((q, i) => <option key={i} value={String(i)}>{q}</option>)}
        <option value="custom">{t.practiceCustom}</option>
      </select>
      {choice === "custom" && <input aria-label={t.practiceCustom} value={custom} maxLength={300} onChange={(e) => setCustom(e.target.value)} style={{ marginTop: 8 }} />}
      <label htmlFor="practice-a">{t.practiceAnswer}</label>
      <textarea id="practice-a" value={answer} maxLength={2000} rows={4} onChange={(e) => setAnswer(e.target.value)} />
      <button type="submit" className="primary" disabled={busy || !question || !answer.trim()}>{busy ? t.working : t.practiceSubmit}</button>
      {feedback && (
        <div className="extra" aria-live="polite">
          <div className="fit"><strong>{feedback.confidence}</strong></div>
          <div className="extra-item"><strong>{t.practiceGood}</strong><p className="pre">{feedback.good}</p></div>
          {feedback.improve.length > 0 && <div className="extra-item"><strong>{t.practiceImprove}</strong><ul>{feedback.improve.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
          <div className="extra-item"><div className="extra-head"><strong>{t.practiceBetter}</strong><CopyButton text={feedback.better} t={t} /></div><p className="pre">{feedback.better}</p></div>
        </div>
      )}
    </form>
  );
}
