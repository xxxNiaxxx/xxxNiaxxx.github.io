"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import type { GuestPageText } from "@/lib/i18n/guest-pages";

interface Quote { nights: number; rent: number; climateFee: number; total: number; currency: string; available: boolean }

export function BookingForm({ token, t, language, today, maxGuests, currency }: { token: string; t: GuestPageText; language: string; today: string; maxGuests: number; currency: string }) {
  const [f, setF] = useState({ checkIn: "", checkOut: "", guestsCount: "2", name: "", email: "", phone: "", message: "", website: "" });
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const money = (n: number) => new Intl.NumberFormat("el-GR", { style: "currency", currency }).format(n);

  useEffect(() => {
    setQuote(null);
    if (!f.checkIn || !f.checkOut || f.checkOut <= f.checkIn) return;
    const ctrl = new AbortController();
    fetch(`/api/public/book/${token}?checkIn=${f.checkIn}&checkOut=${f.checkOut}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.data && setQuote(j.data))
      .catch(() => {});
    return () => ctrl.abort();
  }, [f.checkIn, f.checkOut, token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.checkIn || !f.checkOut || f.name.trim().length < 2 || !f.email.includes("@")) return setError(t.required);
    if (quote && !quote.available) return setError(t.unavailable);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/book/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, guestsCount: Number(f.guestsCount), language }),
      });
      if (res.ok) setDone(true);
      else {
        const msg = (await res.json().catch(() => null))?.error?.message as string | undefined;
        setError(msg === "unavailable" ? t.unavailable : msg === "notFound" ? t.noBooking : t.required);
      }
    } catch {
      setError(t.required);
    } finally {
      setBusy(false);
    }
  }

  if (done) return <p className="mt-6 flex items-start gap-2 rounded-xl bg-success-soft p-4 text-sm text-success"><CheckCircle2 className="size-5 shrink-0" /> {t.requestSent}</p>;

  return (
    <form onSubmit={submit} noValidate className="mt-6 grid gap-4 rounded-xl border border-border bg-surface p-4">
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <input name="website" tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.arrival} htmlFor="checkIn"><Input id="checkIn" type="date" min={today} value={f.checkIn} onChange={set("checkIn")} required /></Field>
        <Field label={t.departure} htmlFor="checkOut"><Input id="checkOut" type="date" min={f.checkIn || today} value={f.checkOut} onChange={set("checkOut")} required /></Field>
      </div>
      {quote && (
        quote.available ? (
          <div className="rounded-lg bg-muted p-3 text-sm">
            <div className="flex justify-between"><span>{quote.nights} {t.nights}</span><span className="tabular-nums">{money(quote.rent)}</span></div>
            {quote.climateFee > 0 && <div className="flex justify-between text-muted-foreground"><span>{t.climateFee}</span><span className="tabular-nums">{money(quote.climateFee)}</span></div>}
            <div className="mt-1 flex justify-between font-semibold"><span>{t.estimate}</span><span className="tabular-nums">{money(quote.total)}</span></div>
          </div>
        ) : (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{t.unavailable}</p>
        )
      )}
      <Field label={`${t.guests} (${t.maxGuests.replace("{n}", String(maxGuests))})`} htmlFor="guestsCount">
        <Input id="guestsCount" type="number" min={1} max={maxGuests} value={f.guestsCount} onChange={set("guestsCount")} />
      </Field>
      <Field label={t.name} htmlFor="name"><Input id="name" value={f.name} onChange={set("name")} autoComplete="name" required /></Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t.email} htmlFor="email"><Input id="email" type="email" value={f.email} onChange={set("email")} autoComplete="email" required /></Field>
        <Field label={t.phone} htmlFor="phone"><Input id="phone" type="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" /></Field>
      </div>
      <Field label={t.message} htmlFor="message"><Textarea id="message" rows={3} value={f.message} onChange={set("message")} /></Field>
      {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
      <Button type="submit" size="lg" loading={busy}>{t.requestBooking}</Button>
    </form>
  );
}
