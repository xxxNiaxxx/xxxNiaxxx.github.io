"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DocumentPreview } from "@/components/DocumentPreview";
import { Extras, Practice } from "@/components/Extras";
import { Tracker } from "@/components/Tracker";
import { exampleFor } from "@/lib/examples";
import { MatchPanel } from "@/components/MatchPanel";
import { readImages, SourceTools, type SourceEvents } from "@/components/SourceTools";
import { parseBlocks } from "@/lib/blocks";
import type { ErrorCode } from "@/lib/errors";
import { copy, format } from "@/lib/i18n";
import { isLanguage, languageLabels, languageNames, languages, type Language } from "@/lib/languages";
import { matchScore } from "@/lib/match";
import { LIMITS, type ApplicationResult } from "@/lib/schema";
import { freeThemes, isPremiumTheme, premiumThemes, type PremiumTheme, type Theme } from "@/lib/themes";

type Version = { result: ApplicationResult; checks: string[]; revision?: string; parent?: number };
type Busy = null | "generate" | "revise";
type Notice = { kind: "error" | "info" | "success"; text: string } | null;

const SUPPORT_CONTACT = process.env.NEXT_PUBLIC_SUPPORT_CONTACT || "";

// Browser storage holds only conveniences (site language, purchase tokens) — never CV text.
function load(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function save(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* private mode: fine */ }
}

class ApiError extends Error {
  constructor(public code: ErrorCode) { super(code); }
}

/** The ?utm_source= label of this visit (e.g. "facebook-group"), kept for the tab only. */
function visitSource(): string {
  try { return window.sessionStorage.getItem("applyready.source") ?? ""; } catch { return ""; }
}

async function postJson(url: string, body: unknown): Promise<Response> {
  let response: Response;
  try {
    const source = visitSource();
    response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(source ? { "X-ApplyReady-Source": source } : {}) }, body: JSON.stringify(body) });
  } catch {
    throw new ApiError("ai_unavailable");
  }
  if (!response.ok) {
    let code: ErrorCode = response.status === 504 ? "ai_timeout" : response.status === 413 ? "too_large" : "server_error";
    try { code = ((await response.json()) as { error?: ErrorCode }).error ?? code; } catch { /* not JSON (e.g. platform timeout page) */ }
    throw new ApiError(code);
  }
  return response;
}

export default function Home() {
  const [uiLang, setUiLang] = useState<Language>("en");
  const [colorScheme, setColorScheme] = useState<"dark" | "light">("dark");
  const [outputLang, setOutputLang] = useState<Language>("en");
  const [outputTouched, setOutputTouched] = useState(false);
  const [cvText, setCvText] = useState("");
  const [jobText, setJobText] = useState("");
  const [companyText, setCompanyText] = useState("");
  const [theme, setTheme] = useState<Theme>("classic");
  const [versions, setVersions] = useState<Version[]>([]);
  const [current, setCurrent] = useState(0);
  const [revision, setRevision] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [premiumCheckout, setPremiumCheckout] = useState(false);
  const [imageInput, setImageInput] = useState(false);
  const [reading, setReading] = useState<string | null>(null);
  const [tokens, setTokens] = useState<Partial<Record<PremiumTheme, string>>>({});
  const outputRef = useRef<HTMLElement>(null);

  const t = copy[uiLang];
  const version = versions[current];
  const message = useCallback((error: unknown) => t.errors[error instanceof ApiError ? error.code : "server_error"] ?? t.errors.server_error, [t]);

  // Restore conveniences and handle a return from Stripe Checkout.
  useEffect(() => {
    const stored = load("applyready.lang");
    const lang = isLanguage(stored) ? stored : languages.find((l) => navigator.language?.toLowerCase().startsWith(l));
    if (lang) { setUiLang(lang); setOutputLang(lang); }
    const restored: Partial<Record<PremiumTheme, string>> = {};
    for (const p of premiumThemes) { const token = load(`applyready.theme.${p}`); if (token) restored[p] = token; }
    setTokens(restored);
    fetch("/api/config").then((r) => r.json()).then((c: { premiumCheckout?: boolean; imageInput?: boolean }) => { setPremiumCheckout(Boolean(c.premiumCheckout)); setImageInput(Boolean(c.imageInput)); }).catch(() => undefined);

    const params = new URLSearchParams(window.location.search);
    const utm = params.get("utm_source");
    if (utm && /^[a-z0-9][a-z0-9._-]{0,39}$/i.test(utm)) {
      try { window.sessionStorage.setItem("applyready.source", utm.toLowerCase()); } catch { /* private mode */ }
    }
    const purchase = params.get("purchase");
    const sessionId = params.get("session_id");
    if (!purchase) return;
    window.history.replaceState(null, "", window.location.pathname);
    const tl = copy[lang ?? "en"];
    if (purchase === "cancelled") { setNotice({ kind: "info", text: tl.purchaseCancelled }); return; }
    if (purchase !== "success" || !sessionId) return;
    // The redirect proves nothing: ask the server, which only answers once the verified webhook has recorded the payment.
    setNotice({ kind: "info", text: tl.purchasePending });
    let cancelled = false;
    (async () => {
      for (let attempt = 0; attempt < 15 && !cancelled; attempt++) {
        try {
          const response = await postJson("/api/stripe/claim", { sessionId });
          const data = (await response.json()) as { theme: PremiumTheme; token: string };
          save(`applyready.theme.${data.theme}`, data.token);
          setTokens((prev) => ({ ...prev, [data.theme]: data.token }));
          setTheme(data.theme);
          setNotice({ kind: "success", text: tl.purchaseSuccess });
          return;
        } catch (error) {
          if (!(error instanceof ApiError) || error.code !== "purchase_pending") { setNotice({ kind: "error", text: tl.errors[error instanceof ApiError ? error.code : "server_error"] }); return; }
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      if (!cancelled) setNotice({ kind: "error", text: tl.errors.purchase_pending });
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { document.documentElement.lang = uiLang; }, [uiLang]);

  // The inline script in layout.tsx already applied a saved choice; mirror it in state.
  useEffect(() => {
    if (document.documentElement.dataset.colorScheme === "light") setColorScheme("light");
  }, []);

  function toggleColorScheme() {
    const next = colorScheme === "dark" ? "light" : "dark";
    setColorScheme(next);
    document.documentElement.dataset.colorScheme = next;
    save("applyready.colorScheme", next);
  }

  function changeUiLang(lang: Language) {
    setUiLang(lang);
    save("applyready.lang", lang);
    if (!outputTouched) setOutputLang(lang);
  }

  /** First version, a revision of the current one, or (with `override`) the current one in another language. */
  async function generate(isRevision: boolean, override?: { revision: string; language: Language }) {
    if (busy) return;
    setNotice(null);
    setBusy(isRevision ? "revise" : "generate");
    const base = isRevision ? version : undefined;
    const request = override?.revision ?? (isRevision ? revision : "");
    const language = override?.language ?? outputLang;
    try {
      const response = await postJson("/api/generate", {
        cvText, jobText, companyText, language, theme,
        revision: request,
        previous: base?.result,
      });
      const data = (await response.json()) as { result: ApplicationResult; checks: string[] };
      const next: Version = { result: data.result, checks: data.checks ?? [], revision: isRevision ? request.trim() : undefined, parent: isRevision ? current : undefined };
      if (override) { setOutputLang(override.language); setOutputTouched(true); }
      // Append, never replace: every earlier version stays available.
      setVersions((prev) => [...prev, next]);
      setCurrent(versions.length);
      setRevision("");
      setNotice({ kind: "success", text: t.ready });
      if (!isRevision) outputRef.current?.focus();
    } catch (error) {
      setNotice({ kind: "error", text: message(error) });
    } finally {
      setBusy(null);
    }
  }

  async function download(document: "cv" | "letter", fmt: "pdf" | "docx") {
    if (!version || exporting) return;
    setExporting(`${document}-${fmt}`);
    setNotice(null);
    try {
      const response = await postJson(`/api/export/${fmt}`, {
        document, theme, language: outputLang,
        cv: version.result.cv, coverLetter: version.result.coverLetter,
        entitlement: isPremiumTheme(theme) ? tokens[theme] : undefined,
      });
      const name = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ?? `applyready.${fmt}`;
      const url = URL.createObjectURL(await response.blob());
      const a = window.document.createElement("a");
      a.href = url;
      a.download = name;
      window.document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setNotice({ kind: "error", text: message(error) });
    } finally {
      setExporting(null);
    }
  }

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setNotice({ kind: "error", text: t.errors.server_error });
    }
  }

  async function buy(themeId: PremiumTheme) {
    setNotice(null);
    try {
      const response = await postJson("/api/stripe/checkout", { theme: themeId });
      const data = (await response.json()) as { url?: string };
      if (data.url) window.location.assign(data.url);
    } catch (error) {
      setNotice({ kind: "error", text: message(error) });
    }
  }

  // Imported or read text is added after what is already in the box, never replacing it.
  const sourceEvents = (setText: (update: (prev: string) => string) => void, max: number): SourceEvents => ({
    onText: (text) => setText((prev) => (prev.trim() ? `${prev.trimEnd()}\n\n${text}` : text).slice(0, max)),
    onBusy: (label) => { setReading(label); if (label) setNotice(null); },
    onError: (code) => setNotice({ kind: "error", text: t.errors[code] ?? t.errors.server_error }),
    onDone: (text) => setNotice({ kind: "success", text }),
  });
  const cvEvents = sourceEvents(setCvText, LIMITS.cvMax);
  const jobEvents = sourceEvents(setJobText, LIMITS.jobMax);

  /** Ctrl+V of a screenshot into a text box reads it with the AI. */
  function pasteImage(event: React.ClipboardEvent, kind: "cv" | "job") {
    if (!imageInput || reading) return;
    const files = [...event.clipboardData.files].filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    event.preventDefault();
    void readImages(files.slice(0, 4), kind, t, kind === "cv" ? cvEvents : jobEvents);
  }

  const letterhead = useMemo(() => (version ? parseBlocks(version.result.cv, { withName: true }).filter((b, i) => i < 3 && (b.kind === "name" || b.kind === "contact")) : []), [version]);
  const [otherLang, setOtherLang] = useState<Language>("en");
  // Keep the "other language" choice different from the current output language.
  useEffect(() => { if (otherLang === outputLang) setOtherLang(outputLang === "en" ? "de" : "en"); }, [outputLang, otherLang]);
  const assistCtx = version ? { language: outputLang, cvText, jobText, companyText, result: version.result } : null;

  async function share() {
    const url = window.location.origin;
    const text = t.shareText;
    try {
      if (navigator.share) await navigator.share({ title: "ApplyReady AI", text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setNotice({ kind: "success", text: t.linkCopied });
      }
    } catch { /* the user closed the share sheet */ }
  }

  const enoughText = cvText.trim().length >= LIMITS.cvMin && jobText.trim().length >= LIMITS.jobMin;
  // Keyword match is computed locally: no request, no AI cost.
  const liveMatch = useMemo(() => (enoughText ? matchScore(cvText, jobText) : null), [enoughText, cvText, jobText]);
  const resultMatch = useMemo(() => (version ? { before: matchScore(cvText, jobText), after: matchScore(version.result.cv, jobText) } : null), [version, cvText, jobText]);

  function askFor(word: string) {
    const line = format(t.matchAsk, { word });
    setRevision((prev) => (prev.includes(line) ? prev : `${prev.trim() ? `${prev.trimEnd()}\n` : ""}${line}`).slice(0, LIMITS.revisionMax));
    document.getElementById("revision")?.focus();
  }

  const canGenerate = enoughText && !busy && !reading;
  const locked = isPremiumTheme(theme) && !tokens[theme];

  const downloadButtons = (document: "cv" | "letter") => (
    <div className="actions" role="group" aria-label={`${t.download}: ${document === "cv" ? t.cvOut : t.letter}`}>
      {(["pdf", "docx"] as const).map((fmt) => (
        <button key={fmt} type="button" className="secondary" disabled={Boolean(exporting) || locked} onClick={() => download(document, fmt)}>
          {exporting === `${document}-${fmt}` ? "…" : `${t.download} ${fmt === "pdf" ? t.pdf : t.docx}`}
        </button>
      ))}
      <button type="button" className="secondary" onClick={() => copyText(document, document === "cv" ? version!.result.cv : version!.result.coverLetter)}>
        {copied === document ? t.copied : t.copy}
      </button>
    </div>
  );

  return (
    <main className="container">
      <header className="topbar">
        <div className="brand">ApplyReady <span>AI</span></div>
        <div className="topbar-controls">
          <button type="button" className="secondary scheme-toggle" onClick={toggleColorScheme}>
            <span aria-hidden="true">{colorScheme === "dark" ? "☀ " : "☾ "}</span>{colorScheme === "dark" ? t.lightMode : t.darkMode}
          </button>
          <label className="inline-label">
            <span>{t.uiLanguage}</span>
            <select className="pill" value={uiLang} onChange={(e) => changeUiLang(e.target.value as Language)}>
              {languages.map((l) => <option key={l} value={l}>{languageLabels[l]}</option>)}
            </select>
          </label>
        </div>
      </header>

      <section className="hero">
        <h1>{t.tagline}</h1>
        <p>{t.intro}</p>
        <ul className="badges" aria-label={t.badges.join(", ")}>{t.badges.map((b) => <li key={b}>✓ {b}</li>)}</ul>
        <ol className="steps">{t.steps.map((s) => <li key={s}>{s}</li>)}</ol>
      </section>

      <div className="layout">
        <form className="panel form-panel" onSubmit={(e) => { e.preventDefault(); if (canGenerate) generate(false); }}>
          <h2>{t.inputHeading}</h2>

          <div className="example-row">
            <button type="button" className="secondary" disabled={Boolean(busy || reading)} onClick={() => { const ex = exampleFor(uiLang); setCvText(ex.cv); setJobText(ex.job); setCompanyText(ex.company); }}>{t.example}</button>
            <span className="small">{t.exampleNote}</span>
          </div>

          <label htmlFor="cv">{t.cv}</label>
          <textarea id="cv" value={cvText} onChange={(e) => setCvText(e.target.value)} maxLength={LIMITS.cvMax} placeholder={t.cvPlaceholder} aria-describedby="cv-count cv-tools-hint" rows={9} onPaste={(e) => pasteImage(e, "cv")} />
          <SourceTools kind="cv" allowFiles imageInput={imageInput} disabled={Boolean(reading || busy)} t={t} events={cvEvents} hintId="cv-tools-hint" />
          <p id="cv-count" className="small counter">{format(t.chars, { n: cvText.length, max: LIMITS.cvMax })}{cvText.trim().length < LIMITS.cvMin && ` · ${format(t.minChars, { min: LIMITS.cvMin })}`}</p>

          <label htmlFor="job">{t.job}</label>
          <textarea id="job" value={jobText} onChange={(e) => setJobText(e.target.value)} maxLength={LIMITS.jobMax} placeholder={t.jobPlaceholder} aria-describedby="job-count job-tools-hint" rows={7} onPaste={(e) => pasteImage(e, "job")} />
          {liveMatch?.comparable && <p className="small live-match">{format(t.matchLive, { n: liveMatch.score })}</p>}
          <SourceTools kind="job" allowFiles={false} imageInput={imageInput} disabled={Boolean(reading || busy)} t={t} events={jobEvents} hintId="job-tools-hint" />
          <p id="job-count" className="small counter">{format(t.chars, { n: jobText.length, max: LIMITS.jobMax })}{jobText.trim().length < LIMITS.jobMin && ` · ${format(t.minChars, { min: LIMITS.jobMin })}`}</p>

          <label htmlFor="company">{t.companyLabel}</label>
          <textarea id="company" value={companyText} onChange={(e) => setCompanyText(e.target.value)} maxLength={LIMITS.companyMax} placeholder={t.companyPlaceholder} aria-describedby="company-hint" rows={3} />
          <p id="company-hint" className="small">{t.companyHint}</p>

          <label htmlFor="output-lang">{t.outputLanguage}</label>
          <select id="output-lang" value={outputLang} onChange={(e) => { setOutputLang(e.target.value as Language); setOutputTouched(true); }}>
            {languages.map((l) => <option key={l} value={l}>{languageLabels[l]}</option>)}
          </select>

          <fieldset className="themes">
            <legend>{t.theme}</legend>
            <div className="theme-grid">
              {freeThemes.map((th) => (
                <label key={th} className={`theme theme-${th} ${theme === th ? "selected" : ""}`}>
                  <input type="radio" name="theme" value={th} checked={theme === th} onChange={() => setTheme(th)} />
                  <span className="swatch" aria-hidden="true" />
                  <strong>{t.themes[th].name}</strong>
                  <span className="small">{t.themes[th].desc}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {theme === "europass" && <p className="small">{t.europassNote}</p>}
          <p className="warning">{t.sensitiveWarning}</p>
          <button type="submit" className="primary" disabled={!canGenerate}>{busy === "generate" ? t.generating : t.generate}</button>

          <section className="premium" aria-labelledby="premium-title">
            <h3 id="premium-title">{t.premiumTitle}</h3>
            <p className="small">{premiumCheckout ? t.premiumBody : t.premiumUnavailable}</p>
            <div className="theme-grid two">
              {premiumThemes.map((th) => {
                const owned = Boolean(tokens[th]);
                return (
                  <div key={th} className={`theme theme-${th} ${theme === th ? "selected" : ""}`}>
                    <span className="swatch" aria-hidden="true" />
                    <strong>{t.themes[th].name} <span className="badge">{owned ? t.owned : t.locked}</span></strong>
                    <span className="small">{t.themes[th].desc}</span>
                    {owned ? (
                      <button type="button" className="secondary" aria-pressed={theme === th} onClick={() => setTheme(th)}>{t.themes[th].name}</button>
                    ) : premiumCheckout ? (
                      <button type="button" className="secondary" onClick={() => buy(th)}>{t.buy}</button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </form>

        <section className="panel output" ref={outputRef} tabIndex={-1} aria-busy={Boolean(busy)} aria-labelledby="output-title">
          <div aria-live="polite" role="status" className="live">
            {notice && <div className={`status ${notice.kind}`} role={notice.kind === "error" ? "alert" : undefined}>{notice.text}</div>}
            {reading && <div className="status info"><span className="spinner" aria-hidden="true" />{reading}</div>}
            {busy && <div className="status info"><span className="spinner" aria-hidden="true" />{busy === "generate" ? t.generating : t.revising}</div>}
          </div>

          {!version ? (
            <div className="empty">
              <h2 id="output-title">{t.emptyTitle}</h2>
              <p>{t.emptyBody}</p>
            </div>
          ) : (
            <>
              {versions.length > 1 && (
                <nav className="versions" aria-label={t.versions}>
                  <span className="small">{t.versions}:</span>
                  {versions.map((v, i) => (
                    <button key={i} type="button" className={`chip ${i === current ? "active" : ""}`} aria-pressed={i === current}
                      title={v.parent !== undefined ? `${format(t.revisionOf, { n: v.parent + 1 })}: ${v.revision ?? ""}` : undefined}
                      onClick={() => setCurrent(i)}>
                      {format(t.version, { n: i + 1 })}
                    </button>
                  ))}
                </nav>
              )}

              {version.result.strengths.length > 0 && (
                <section className="fit" aria-labelledby="fit-title">
                  <h2 id="fit-title">{t.fitTitle}</h2>
                  <p className="small">{t.fitHint}</p>
                  <ul>
                    {version.result.strengths.map((s, i) => (
                      <li key={i}>
                        <strong>{s.strength}</strong>
                        {s.evidence && <span className="small fit-evidence">{t.fitEvidence} {s.evidence}</span>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {version.result.values.length > 0 && (
                <section className="values" aria-labelledby="values-title">
                  <h2 id="values-title">{t.valuesTitle}</h2>
                  <p className="small">{t.valuesHint}</p>
                  <ul>
                    {version.result.values.map((v, i) => (
                      <li key={i} className={v.evidence ? "has" : "open"}>
                        <strong>{v.evidence ? "✓ " : "? "}{v.value}</strong>
                        {v.evidence
                          ? <span className="small block">{t.valuesEvidence} {v.evidence}</span>
                          : <span className="small block">{t.valuesNoEvidence}</span>}
                        {v.howToShow && <span className="small block">{v.evidence ? t.valuesHow : t.valuesReflect} {v.howToShow}</span>}
                      </li>
                    ))}
                  </ul>
                  <p className="small">{t.valuesTwoWay}</p>
                </section>
              )}

              <h2 id="output-title">{t.cvOut}</h2>
              <p className="small">{t.reviewWarning}</p>
              {downloadButtons("cv")}
              <DocumentPreview text={version.result.cv} theme={theme} kind="cv" />

              {resultMatch && <MatchPanel before={resultMatch.before} after={resultMatch.after} t={t} onAsk={askFor} />}

              {version.checks.length > 0 && (
                <div className="callout">
                  <strong>{t.checksTitle}</strong>
                  <p className="small">{t.checksBody} {version.checks.join(", ")}</p>
                </div>
              )}

              <div className="result-section">
                <h2>{t.letter}</h2>
                {downloadButtons("letter")}
                <DocumentPreview text={version.result.coverLetter} theme={theme} kind="letter" letterhead={letterhead} />
              </div>

              <div className="result-section">
                <h2>{t.gaps}</h2>
                <p className="small">{t.gapsHint}</p>
                {version.result.gaps.length ? <ul className="gaps">{version.result.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul> : <p>{t.gapsEmpty}</p>}
              </div>

              {version.result.interview.length > 0 && (
                <div className="result-section">
                  <h2>{t.interviewTitle}</h2>
                  <p className="small">{t.interviewHint}</p>
                  {version.result.interview.map((item, i) => (
                    <details key={i} className="qa" open={i === 0}>
                      <summary>{item.question}</summary>
                      <p>{item.answer}</p>
                    </details>
                  ))}
                  <p className="small rights">⚖ {t.interviewRights}</p>
                </div>
              )}

              <Practice key={`practice-${current}`} ctx={assistCtx!} t={t} post={postJson} onError={(e) => setNotice({ kind: "error", text: message(e) })} />
              <Extras key={`extras-${current}`} ctx={assistCtx!} t={t} post={postJson} onError={(e) => setNotice({ kind: "error", text: message(e) })} />

              <form className="result-section" onSubmit={(e) => {
                e.preventDefault();
                if (otherLang === outputLang || busy) return;
                void generate(true, { language: otherLang, revision: `Rewrite the whole result (CV, cover letter, gaps, strengths, interview) in ${languageNames[otherLang]}. Keep every fact exactly as it is; change nothing else.` });
              }}>
                <label htmlFor="other-lang">{t.otherLanguage}</label>
                <div className="inline-row">
                  <select id="other-lang" value={otherLang} onChange={(e) => setOtherLang(e.target.value as Language)}>
                    {languages.filter((l) => l !== outputLang).map((l) => <option key={l} value={l}>{languageLabels[l]}</option>)}
                  </select>
                  <button type="submit" className="secondary" disabled={Boolean(busy) || otherLang === outputLang}>{busy === "revise" ? t.revising : t.otherLanguageBtn}</button>
                </div>
              </form>

              <form className="result-section" onSubmit={(e) => { e.preventDefault(); if (revision.trim() && !busy) generate(true); }}>
                <label htmlFor="revision">{t.revisionLabel}</label>
                <textarea id="revision" value={revision} onChange={(e) => setRevision(e.target.value)} maxLength={LIMITS.revisionMax} placeholder={t.revisionPlaceholder} rows={3} aria-describedby="revision-note" />
                <p id="revision-note" className="small">{t.revisionNote}</p>
                <button type="submit" className="primary" disabled={Boolean(busy) || !revision.trim()}>{busy === "revise" ? t.revising : t.revise}</button>
              </form>
            </>
          )}
          {version && (
            <div className="result-section share">
              <button type="button" className="secondary" onClick={share}>🙌 {t.share}</button>
            </div>
          )}
        </section>
      </div>

      <Tracker t={t} onPractice={version ? () => document.getElementById("practice")?.scrollIntoView({ behavior: "smooth" }) : undefined} />

      <details className="privacy">
        <summary>{t.privacyTitle}</summary>
        {t.privacy.map((p) => <p key={p}>{p}</p>)}
        {SUPPORT_CONTACT && <p>{format(t.contact, { contact: SUPPORT_CONTACT })}</p>}
      </details>
      <footer>{t.footer}</footer>
    </main>
  );
}
