"use client";

import { useEffect, useState } from "react";
import { format, type copy } from "@/lib/i18n";
import { daysSince, followUpDue, loadApplications, newApplication, saveApplications, sortApplications, statuses, type Status, type TrackedApplication } from "@/lib/tracker";

type Copy = (typeof copy)["en"];

const statusLabel = (t: Copy, s: Status) => ({ sent: t.statusSent, interview: t.statusInterview, offer: t.statusOffer, rejected: t.statusRejected })[s];

/** "My applications": kept in this browser only. */
export function Tracker({ t, onPractice }: { t: Copy; onPractice?: () => void }) {
  const [items, setItems] = useState<TrackedApplication[]>([]);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => { setItems(loadApplications()); }, []);
  const update = (next: TrackedApplication[]) => { setItems(next); saveApplications(next); };

  return (
    <section className="panel tracker" aria-labelledby="tracker-title">
      <h2 id="tracker-title">{t.trackerTitle}</h2>
      <p className="small">{t.trackerHint}</p>
      <form className="tracker-form" onSubmit={(e) => {
        e.preventDefault();
        if (!company.trim()) return;
        update([newApplication(company, role), ...items]);
        setCompany(""); setRole("");
      }}>
        <input aria-label={t.trackerCompany} placeholder={t.trackerCompany} value={company} maxLength={120} onChange={(e) => setCompany(e.target.value)} />
        <input aria-label={t.trackerRole} placeholder={t.trackerRole} value={role} maxLength={120} onChange={(e) => setRole(e.target.value)} />
        <button type="submit" className="secondary" disabled={!company.trim()}>{t.trackerAdd}</button>
      </form>
      {!items.length ? <p className="small">{t.trackerEmpty}</p> : (
        <ul className="tracker-list">
          {sortApplications(items).map((app) => (
            <li key={app.id} className={followUpDue(app) ? "due" : undefined}>
              <div className="tracker-main">
                <strong>{app.company}</strong>{app.role && <span> · {app.role}</span>}
                <span className="small"> · {app.sentOn}</span>
                {followUpDue(app) && <div className="small tracker-note">{format(t.trackerFollowUp, { n: daysSince(app.sentOn) })}</div>}
                {app.status === "interview" && (
                  <div className="small tracker-note">{t.trackerInterview} {onPractice && <button type="button" className="link-btn" onClick={onPractice}>{t.trackerPractice}</button>}</div>
                )}
              </div>
              <select aria-label={app.company} value={app.status} onChange={(e) => update(items.map((x) => (x.id === app.id ? { ...x, status: e.target.value as Status } : x)))}>
                {statuses.map((s) => <option key={s} value={s}>{statusLabel(t, s)}</option>)}
              </select>
              <button type="button" className="link-btn" aria-label={`${t.trackerDelete}: ${app.company}`} onClick={() => update(items.filter((x) => x.id !== app.id))}>✕</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
