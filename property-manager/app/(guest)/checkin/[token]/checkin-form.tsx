"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import type { GuestPageText } from "@/lib/i18n/guest-pages";

export function CheckinForm({ token, t, houseRules, prefill }: { token: string; t: GuestPageText; houseRules: string | null; prefill: { phone: string; email: string; country: string } }) {
  const [f, setF] = useState({ idNumber: "", phone: prefill.phone, email: prefill.email, country: prefill.country, arrivalTime: "" });
  const [acceptRules, setAcceptRules] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.idNumber.trim().length < 4) return setError(t.required);
    if ((houseRules && !acceptRules) || !consent) return setError(t.mustAccept);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/checkin/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, acceptRules, consent }),
      });
      if (!res.ok) {
        const msg = (await res.json().catch(() => null))?.error?.message as string | undefined;
        if (msg === "alreadyDone") setDone(true);
        else setError(msg === "mustAccept" ? t.mustAccept : msg === "notFound" ? t.notFound : t.required);
      } else setDone(true);
    } catch {
      setError(t.notFound);
    } finally {
      setBusy(false);
    }
  }

  if (done) return <p className="mt-6 flex items-center gap-2 rounded-xl bg-success-soft p-4 text-sm text-success"><CheckCircle2 className="size-5" /> {t.done}</p>;

  return (
    <form onSubmit={submit} noValidate className="mt-4 grid gap-4">
      <Field label={t.idNumber} htmlFor="idNumber" hint={t.idHint}>
        <Input id="idNumber" value={f.idNumber} onChange={set("idNumber")} autoComplete="off" required />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t.phone} htmlFor="phone"><Input id="phone" type="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" /></Field>
        <Field label={t.email} htmlFor="email"><Input id="email" type="email" value={f.email} onChange={set("email")} autoComplete="email" /></Field>
        <Field label={t.country} htmlFor="country"><Input id="country" value={f.country} onChange={set("country")} autoComplete="country-name" /></Field>
        <Field label={t.arrivalTime} htmlFor="arrivalTime"><Input id="arrivalTime" type="time" value={f.arrivalTime} onChange={set("arrivalTime")} /></Field>
      </div>
      {houseRules && (
        <div className="grid gap-2">
          <div className="text-[13px] font-medium">{t.houseRules}</div>
          <p className="rounded-lg bg-muted p-3 text-sm whitespace-pre-line">{houseRules}</p>
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" checked={acceptRules} onChange={(e) => setAcceptRules(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)]" />
            {t.acceptRules}
          </label>
        </div>
      )}
      <label className="flex items-start gap-2.5 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)]" />
        {t.consent}
      </label>
      {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
      <Button type="submit" size="lg" loading={busy}>{t.submit}</Button>
    </form>
  );
}
