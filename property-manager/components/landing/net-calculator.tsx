"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { calculateNet } from "@/lib/tax/calculator";
import { cn } from "@/lib/utils";

const eur = (n: number) => `${n.toLocaleString("el-GR", { maximumFractionDigits: 0 })} €`;
const pct = (n: number) => `${(n * 100).toLocaleString("el-GR", { maximumFractionDigits: 1 })}%`;

function NumberField({ id, label, hint, value, onChange, suffix, max }: { id: string; label: string; hint?: string; value: number; onChange: (v: number) => void; suffix?: string; max?: number }) {
  return (
    <label htmlFor={id} className="grid gap-1.5">
      <span className="text-[13px] font-medium">{label}</span>
      <span className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          max={max}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className="h-11 w-full rounded-xl border border-border bg-surface px-3 pr-12 text-[15px] tabular-nums outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">{suffix}</span>}
      </span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function Row({ label, value, tone, hint }: { label: string; value: string; tone?: "neg" | "pos" | "muted"; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border py-2.5 last:border-0">
      <span className="text-sm">
        {label}
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <span className={cn("shrink-0 font-semibold tabular-nums", tone === "neg" && "text-danger", tone === "pos" && "text-success", tone === "muted" && "text-muted-foreground")}>{value}</span>
    </div>
  );
}

/** «Υπολογιστής καθαρών»: everything runs in the browser, nothing is sent or stored. */
export function NetCalculator({ year }: { year: number }) {
  const [highNights, setHigh] = useState(120);
  const [lowNights, setLow] = useState(30);
  const [nightlyPrice, setPrice] = useState(80);
  const [airbnbPercent, setAirbnb] = useState(60);
  const [bookingPercent, setBooking] = useState(40);
  const [expenses, setExpenses] = useState(2000);
  const [largeHouse, setLarge] = useState(false);
  const [otherPropertyIncome, setOther] = useState(0);

  const r = useMemo(
    () => calculateNet({ year, largeHouse, highNights, lowNights, nightlyPrice, airbnbPercent, bookingPercent, expenses, otherPropertyIncome }),
    [year, largeHouse, highNights, lowNights, nightlyPrice, airbnbPercent, bookingPercent, expenses, otherPropertyIncome],
  );
  const direct = Math.round(r.shares.direct * 100);
  const parts = [
    { label: "Σας μένουν", value: Math.max(0, r.net), className: "bg-success" },
    { label: "Φόρος", value: r.incomeTax, className: "bg-warning" },
    { label: "Προμήθειες", value: r.commissions, className: "bg-danger" },
    { label: "Έξοδα", value: r.expenses, className: "bg-muted-foreground/60" },
  ];
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <div className="grid gap-4 rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-base font-semibold">Το κατάλυμά σας, για το {year}</h2>
        <p className="-mt-2 text-xs text-muted-foreground">Πόσες νύχτες θα είναι (ή ήταν) κλεισμένες μέσα στη χρονιά.</p>
        <div className="grid grid-cols-2 gap-3">
          <NumberField id="high" label="Νύχτες Απρ–Οκτ" value={highNights} onChange={setHigh} max={214} />
          <NumberField id="low" label="Νύχτες Νοε–Μαρ" value={lowNights} onChange={setLow} max={151} />
        </div>
        <NumberField id="price" label="Μέση τιμή ανά νύχτα" value={nightlyPrice} onChange={setPrice} suffix="€" hint="Τι πληρώνει ο επισκέπτης για το δωμάτιο, χωρίς το ΤΑΚΚ." />
        <div className="grid grid-cols-2 gap-3">
          <NumberField id="airbnb" label="Από Airbnb" value={airbnbPercent} onChange={(v) => { setAirbnb(v); if (v + bookingPercent > 100) setBooking(Math.max(0, 100 - v)); }} suffix="%" max={100} />
          <NumberField id="booking" label="Από Booking" value={bookingPercent} onChange={(v) => { setBooking(v); if (v + airbnbPercent > 100) setAirbnb(Math.max(0, 100 - v)); }} suffix="%" max={100} />
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">{direct > 0 ? `Απευθείας κρατήσεις (χωρίς προμήθεια): ${direct}%` : "Όλες οι κρατήσεις από πλατφόρμες."}</p>
        <NumberField id="expenses" label="Έξοδα της χρονιάς" value={expenses} onChange={setExpenses} suffix="€" hint="Καθαρισμός, ρεύμα, νερό, internet, αναλώσιμα, συντήρηση." />
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 size-4 accent-[var(--color-accent)]" checked={largeHouse} onChange={(e) => setLarge(e.target.checked)} />
          <span>Μονοκατοικία άνω των 80 τ.μ. <span className="block text-xs text-muted-foreground">Πληρώνει υψηλότερο ΤΑΚΚ ανά νύχτα.</span></span>
        </label>
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Έχω και άλλα εισοδήματα από ακίνητα</summary>
          <div className="mt-3">
            <NumberField id="other" label="Άλλα ενοίκια της χρονιάς (π.χ. μακροχρόνια)" value={otherPropertyIncome} onChange={setOther} suffix="€" hint="Φορολογούνται στην ίδια κλίμακα, οπότε ανεβάζουν τον συντελεστή." />
          </div>
        </details>
      </div>

      <div className="grid gap-4 lg:sticky lg:top-6">
        <div className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-[var(--shadow-card)]">
          <p className="text-sm text-white/70">Σας μένουν περίπου</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums" aria-live="polite">{eur(r.net)}</p>
          <p className="mt-1 text-sm text-white/70">
            {r.nights} νύχτες · {eur(r.netPerNight)} καθαρά τη νύχτα · ο φόρος είναι το {pct(r.effectiveTaxRate)} των εσόδων
          </p>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-white/10" aria-hidden>
            {parts.map((p) => <span key={p.label} className={p.className} style={{ width: `${(p.value / total) * 100}%` }} />)}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/70">
            {parts.map((p) => <span key={p.label} className="flex items-center gap-1.5"><span className={cn("size-2 rounded-full", p.className)} />{p.label}</span>)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
          <Row label="Έσοδα από κρατήσεις" value={eur(r.rent)} />
          {r.airbnbCommission > 0 && <Row label="Προμήθεια Airbnb (15,5%)" value={`−${eur(r.airbnbCommission)}`} tone="neg" />}
          {r.bookingCommission > 0 && <Row label="Προμήθεια Booking (15% + χρέωση πληρωμών)" value={`−${eur(r.bookingCommission)}`} tone="neg" />}
          <Row label="Έξοδα" value={`−${eur(r.expenses)}`} tone="neg" />
          <Row label="Φόρος εισοδήματος (Ε2)" hint={`Στο ${eur(r.taxable)}: έσοδα μείον 5%· προμήθειες και έξοδα δεν αφαιρούνται.`} value={`−${eur(r.incomeTax)}`} tone="neg" />
          <Row label="Καθαρά" value={eur(r.net)} tone="pos" />
          <Row label="ΤΑΚΚ που αποδίδετε στην ΑΑΔΕ" hint={`${r.takkHigh} €/νύχτα Απρ–Οκτ, ${r.takkLow} €/νύχτα Νοε–Μαρ· το πληρώνει ο επισκέπτης, δεν είναι έσοδο.`} value={eur(r.climateFee)} tone="muted" />
        </div>
        <div className="rounded-2xl border border-accent/30 bg-accent-soft/40 p-5">
          <p className="font-medium">Δείτε τα πραγματικά σας νούμερα, κράτηση-κράτηση</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ανεβάστε τα αρχεία κρατήσεων της Airbnb και της Booking: η εφαρμογή βγάζει καθαρά, ΤΑΚΚ ανά μήνα, εκτίμηση φόρου και τη δήλωση στην ΑΑΔΕ. Δωρεάν μέχρι το τέλος του 2026.
          </p>
          <Link href="/waitlist?utm_source=calculator" className="mt-3 inline-block rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">Θέλω να το δοκιμάσω</Link>
        </div>
      </div>
    </div>
  );
}
