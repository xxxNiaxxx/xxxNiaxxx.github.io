import type { copy } from "@/lib/i18n";
import { format } from "@/lib/i18n";
import type { MatchResult } from "@/lib/match";

type Copy = (typeof copy)["en"];

function Meter({ label, score }: { label: string; score: number }) {
  return (
    <div className="meter">
      <div className="meter-head"><span>{label}</span><strong>{score}%</strong></div>
      <div className="meter-track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}>
        <div className="meter-fill" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

/** "Your CV vs the tailored CV" keyword match, with the ad's words found and missing. */
export function MatchPanel({ before, after, t, onAsk }: { before: MatchResult; after: MatchResult; t: Copy; onAsk: (word: string) => void }) {
  return (
    <section className="match" aria-labelledby="match-title">
      <h3 id="match-title">{t.matchTitle}</h3>
      {!after.comparable ? (
        <p className="small">{t.matchLanguages}</p>
      ) : (
        <>
          <div className="meters">
            {before.comparable && <Meter label={t.matchBefore} score={before.score} />}
            <Meter label={t.matchAfter} score={after.score} />
          </div>
          {after.matched.length > 0 && (
            <>
              <p className="small match-label">{t.matchFound}</p>
              <ul className="chips">{after.matched.map((w) => <li key={w} className="kw kw-found">{w}</li>)}</ul>
            </>
          )}
          {after.missing.length > 0 && (
            <>
              <p className="small match-label">{t.matchMissing}</p>
              <ul className="chips">
                {after.missing.map((w) => (
                  <li key={w}>
                    <button type="button" className="kw kw-missing" onClick={() => onAsk(w)} title={format(t.matchAsk, { word: w })}>+ {w}</button>
                  </li>
                ))}
              </ul>
              <p className="small">{t.matchMissingHint}</p>
            </>
          )}
          <p className="small match-note">{t.matchNote}</p>
        </>
      )}
    </section>
  );
}
