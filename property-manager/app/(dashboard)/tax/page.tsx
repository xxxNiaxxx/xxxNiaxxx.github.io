import { AlertTriangle, Download, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DeclareButton, FilingButton, NotRequiredButton, OtherIncomeInput, PricingSettings, RegimeSelect } from "@/components/tax/actions";
import { ComplianceChecklist } from "@/components/tax/compliance-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState, LinkTabs, PageHeader, Stat } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { formatDay, formatMoney } from "@/lib/format";
import { hasRole } from "@/lib/permissions";
import { getAnnualReport, getTaxContext, getTaxOverview } from "@/lib/services/tax";
import { db } from "@/lib/db";
import { LAST_REVIEWED, SOURCES } from "@/lib/tax/gr";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Φορολογικά & ΑΑΔΕ" };

const MONTHS = ["Ιαν", "Φεβ", "Μαρ", "Απρ", "Μάι", "Ιουν", "Ιουλ", "Αύγ", "Σεπ", "Οκτ", "Νοε", "Δεκ"];
const periodLabel = (p: string) => `${MONTHS[Number(p.slice(5)) - 1]} ${p.slice(0, 4)}`;
const pct = (r: number) => `${Math.round(r * 100)}%`;

export default async function TaxPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { ctx } = await getPageContext();
  const sp = await searchParams;
  const tab = ["obligations", "annual", "compliance"].includes(sp.tab) ? sp.tab : "obligations";
  const [o, taxContext] = await Promise.all([getTaxOverview(ctx), getTaxContext(ctx)]);
  const year = Number(sp.year) >= 2018 && Number(sp.year) <= 2100 ? Number(sp.year) : Number(o.today.slice(0, 4));
  const otherIncome = Math.max(0, Number(sp.otherIncome) || 0);
  const business = o.regime === "BUSINESS";

  return (
    <>
      <PageHeader
        title="Φορολογικά & ΑΑΔΕ"
        description="Υποχρεώσεις βραχυχρόνιας μίσθωσης: δηλώσεις διαμονής, ΤΑΚΚ, φόρος εισοδήματος και συμμόρφωση"
        actions={
          <>
            <Button asChild variant="outline"><a href={`/api/tax/export?type=stays&year=${year}`}><Download /> Διαμονές CSV {year}</a></Button>
            <Button asChild variant="outline"><a href={`/api/tax/export?type=annual&year=${year}`}><Download /> Ετήσια CSV {year}</a></Button>
          </>
        }
      />

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Φορολογικό καθεστώς:</span>
          <Badge tone={business ? "accent" : "info"}>{business ? "Επιχείρηση (έναρξη εργασιών)" : "Ιδιώτης (εισόδημα από ακίνητα)"}</Badge>
          <span className="text-muted-foreground">· {o.propertiesWithAma} {o.propertiesWithAma === 1 ? "ακίνητο" : "ακίνητα"} με ΑΜΑ</span>
        </div>
        <RegimeSelect value={o.regimeSetting} disabled={!hasRole(ctx, "ADMIN")} />
        <div className="w-full border-t border-border pt-3 sm:basis-full">
          <PricingSettings commissionRates={taxContext.commissionRates} businessTaxRate={taxContext.businessTaxRate} business={business} disabled={!hasRole(ctx, "ADMIN")} />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Δηλώσεις διαμονής" value={o.totals.declarationsDue} hint={o.totals.declarationsOverdue ? `${o.totals.declarationsOverdue} εκπρόθεσμες` : "καμία εκπρόθεσμη"} />
        <Stat label="ΤΑΚΚ προς δήλωση" value={formatMoney(o.totals.climateFeeUnfiled)} hint="μήνες που έκλεισαν" />
        <Stat label="Ακίνητα χωρίς ΑΜΑ" value={o.compliance.filter((c) => !c.ama).length} />
        <Stat label="Θέματα ασφάλισης" value={o.compliance.filter((c) => c.insuranceStatus !== "OK").length} hint="λείπει / λήγει" />
      </div>

      {o.warnings.length > 0 && (
        <Card className="mb-5">
          <CardContent className="grid gap-2 pt-5">
            {o.warnings.map((w, i) => (
              <div key={i} className={cn("flex gap-3 rounded-xl p-3 text-sm", w.level === "high" ? "bg-danger-soft" : w.level === "medium" ? "bg-warning-soft" : "bg-muted")}>
                <AlertTriangle className={cn("mt-0.5 size-4 shrink-0", w.level === "high" ? "text-danger" : w.level === "medium" ? "text-warning" : "text-muted-foreground")} />
                <div>
                  <div className="font-medium">{w.title}</div>
                  <div className="text-[13px] text-muted-foreground">{w.detail}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mb-5">
        <LinkTabs
          active={tab}
          tabs={[
            { key: "obligations", label: "Υποχρεώσεις", href: "/tax", count: o.totals.declarationsDue },
            { key: "annual", label: business ? "Ετήσια σύνοψη" : "Ετήσιο Ε2", href: `/tax?tab=annual&year=${year}` },
            { key: "compliance", label: "Συμμόρφωση", href: "/tax?tab=compliance" },
          ]}
        />
      </div>

      {tab === "obligations" && <Obligations o={o} business={business} />}
      {tab === "annual" && <Annual ctxYear={year} otherIncome={otherIncome} business={business} report={await getAnnualReport(ctx, year, otherIncome)} />}
      {tab === "compliance" && <Compliance o={o} propertiesCompliance={await db.property.findMany({ where: { organizationId: ctx.organizationId, status: "ACTIVE" }, select: { id: true, compliance: true } })} />}

      <Card className="mt-6">
        <CardContent className="flex gap-3 pt-5 text-[13px] text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          <div>
            Οι υπολογισμοί ακολουθούν τους κανόνες που ίσχυαν στις {formatDay(LAST_REVIEWED, { day: "numeric", month: "long", year: "numeric" })} και είναι βοήθημα, όχι φορολογική συμβουλή — επιβεβαιώστε τα ποσά με τον λογιστή σας πριν από κάθε υποβολή.
            Πηγές:{" "}
            {SOURCES.map((s, i) => (
              <span key={s.url}>
                <a className="underline underline-offset-2 hover:text-foreground" href={s.url} target="_blank" rel="noreferrer">{s.label}</a>
                {i < SOURCES.length - 1 ? " · " : ""}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function Obligations({ o, business }: { o: Awaited<ReturnType<typeof getTaxOverview>>; business: boolean }) {
  return (
    <div className="grid gap-6">
      <Card className="overflow-hidden">
        <CardHeader title="Δηλώσεις Βραχυχρόνιας Διαμονής" description="Μία για κάθε διαμονή, στο myAADE, έως τις 20 του επόμενου μήνα από την αναχώρηση (ή από ακύρωση με πληρωμή). Εκπρόθεσμη υποβολή: πρόστιμο 100 €." />
        {o.pendingDeclarations.length === 0 ? (
          <EmptyState title="Όλες οι διαμονές έχουν δηλωθεί" description="Οι διαμονές εμφανίζονται εδώ μετά την αναχώρηση." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border text-left text-xs text-muted-foreground">
                  <th className="px-5 py-2 font-medium">Επισκέπτης</th>
                  <th className="px-5 py-2 font-medium">Ακίνητο · ΑΜΑ</th>
                  <th className="px-5 py-2 font-medium">Διαμονή</th>
                  <th className="px-5 py-2 text-right font-medium">Ποσό</th>
                  <th className="px-5 py-2 font-medium">Προθεσμία</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {o.pendingDeclarations.map((s) => (
                  <tr key={s.reservationId}>
                    <td className="px-5 py-2.5">
                      <Link href={`/reservations/${s.reservationId}`} className="font-medium hover:underline">{s.guestName}</Link>
                      {s.status === "CANCELLED" && <div className="text-xs text-muted-foreground">Ακύρωση με πληρωμή</div>}
                    </td>
                    <td className="px-5 py-2.5">{s.propertyName}<div className="text-xs text-muted-foreground">{s.ama ?? <span className="text-danger">Χωρίς ΑΜΑ</span>}</div></td>
                    <td className="px-5 py-2.5 whitespace-nowrap">{formatDay(s.checkIn, { day: "numeric", month: "short" })} → {formatDay(s.checkOut, { day: "numeric", month: "short" })}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{formatMoney(s.totalAmount)}</td>
                    <td className="px-5 py-2.5 whitespace-nowrap">
                      <Badge tone={s.declaration.overdue ? "danger" : s.declaration.daysLeft <= 7 ? "warning" : "neutral"}>
                        {s.declaration.overdue ? "Εκπρόθεσμη · " : ""}{formatDay(s.declaration.deadline, { day: "numeric", month: "short" })}
                      </Badge>
                    </td>
                    <td className="px-5 py-2.5 text-right whitespace-nowrap"><NotRequiredButton reservationId={s.reservationId} /> <DeclareButton reservationId={s.reservationId} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader
          title={business ? "Μηνιαίες δηλώσεις: ΤΑΚΚ, ΦΠΑ και τέλος παρεπιδημούντων" : "Τέλος Ανθεκτικότητας (ΤΑΚΚ) — μηνιαία δήλωση"}
          description={`Ανά νύχτα ανά ακίνητο: 8 € Απρ–Οκτ / 2 € Νοε–Μαρ· μονοκατοικίες άνω των 80 m²: 15 € / 4 €. Οι νύχτες μοιράζονται ανά μήνα — κράτηση που περνά σε νέο μήνα δηλώνεται και στους δύο. Υποβολή στο myAADE έως την τελευταία ημέρα του επόμενου μήνα.${business ? " Ο ΦΠΑ 13% και το τέλος παρεπιδημούντων 0,5% εξάγονται από το σύνολο κάθε κράτησης." : ""}`}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-2 font-medium">Μήνας</th>
                <th className="px-5 py-2 text-right font-medium">Διαμονές</th>
                <th className="px-5 py-2 text-right font-medium">Νύχτες</th>
                <th className="px-5 py-2 text-right font-medium" title="Κρατήσεις με αναχώρηση μέσα στον μήνα">Ακαθάριστα (αναχωρήσεις)</th>
                <th className="px-5 py-2 text-right font-medium">ΤΑΚΚ</th>
                <th className="px-5 py-2 font-medium">Προθεσμία</th>
                {business && <th className="px-5 py-2 text-right font-medium">ΦΠΑ</th>}
                {business && <th className="px-5 py-2 text-right font-medium">Τέλος παρεπιδημούντων</th>}
                <th className="px-5 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {o.monthly.filter((m) => m.stays > 0 || m.climateFeeFiled || !m.closed).map((m) => (
                <tr key={m.period} className={cn(!m.closed && "text-muted-foreground")}>
                  <td className="px-5 py-2.5 font-medium whitespace-nowrap">{periodLabel(m.period)}{!m.closed && <span className="ml-1.5 text-xs font-normal">(σε εξέλιξη)</span>}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{m.stays}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{m.nights}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{formatMoney(m.gross)}</td>
                  <td className="px-5 py-2.5 text-right font-medium tabular-nums">{formatMoney(m.climateFee)}</td>
                  <td className="px-5 py-2.5 whitespace-nowrap">
                    {m.climateFeeFiled ? <Badge tone="success">Δηλώθηκε</Badge> : m.climateFee === 0 ? <span className="text-xs">—</span> : <Badge tone={m.climateFeeOverdue ? "danger" : "neutral"}>{m.climateFeeOverdue ? "Εκπρόθεσμο · " : ""}{formatDay(m.climateFeeDeadline, { day: "numeric", month: "short" })}</Badge>}
                  </td>
                  {business && <td className="px-5 py-2.5 text-right tabular-nums">{formatMoney(m.vat)}</td>}
                  {business && <td className="px-5 py-2.5 text-right tabular-nums">{formatMoney(m.presenceFee)}</td>}
                  <td className="px-5 py-2.5 text-right">{m.closed && m.climateFee > 0 && <FilingButton kind="CLIMATE_FEE" period={m.period} amount={m.climateFee} filed={Boolean(m.climateFeeFiled)} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Annual({ ctxYear, otherIncome, business, report: r }: { ctxYear: number; otherIncome: number; business: boolean; report: Awaited<ReturnType<typeof getAnnualReport>> }) {
  const years = [ctxYear - 1, ctxYear, ctxYear + 1].filter((y) => y <= new Date().getFullYear() + 1);
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <LinkTabs active={String(ctxYear)} tabs={years.map((y) => ({ key: String(y), label: String(y), href: `/tax?tab=annual&year=${y}${otherIncome ? `&otherIncome=${otherIncome}` : ""}` }))} />
      </div>
      {business ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat label="Έσοδα χωρίς ΦΠΑ" value={formatMoney(r.business.revenueExVat)} />
          <Stat label="ΦΠΑ 13%" value={formatMoney(r.business.vat)} />
          <Stat label="Τέλος παρεπιδημούντων 0,5%" value={formatMoney(r.business.presenceFee)} />
          <Stat label="Κέρδος προ φόρων" value={formatMoney(r.business.profitBeforeTax)} hint={`μετά από ${formatMoney(r.business.expenses)} έξοδα (και προμήθειες)`} />
          <Stat label="Φόρος εισοδήματος (εκτίμηση)" value={formatMoney(r.business.estimatedTax)}
            hint={r.business.taxRateSource === "SETTING" ? "με τον δικό σας συντελεστή" : `κλίμακα ${ctxYear} · μέσος ${Math.round(r.effectiveTaxRate * 1000) / 10}% · χωρίς εισφορές ΕΦΚΑ`} />
          <Stat label="Καθαρά μετά φόρων" value={formatMoney(r.business.profitAfterTax)} />
        </div>
      ) : (
        <Card>
          <CardHeader title={`Εκτίμηση Ε2 — εισοδήματα ${ctxYear}`} description="Ιδιώτες: το ακαθάριστο μίσθωμα φορολογείται ως εισόδημα από ακίνητη περιουσία με έκπτωση 5%· πραγματικά έξοδα, καθαρισμός και προμήθειες πλατφορμών δεν εκπίπτουν." />
          <CardContent className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <dl className="grid gap-2 text-sm">
              <Row label="Ακαθάριστο μίσθωμα (κρατήσεις)" value={formatMoney(r.individual.gross)} />
              <Row label="− Έκπτωση 5%" value={formatMoney(r.individual.deduction)} />
              <Row label="Φορολογητέο" value={formatMoney(r.individual.taxable)} strong />
              <Row label="Εκτιμώμενος φόρος" value={formatMoney(r.individual.estimatedTax)} strong />
              <div className="mt-2 flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
                <span>Άλλα εισοδήματα από ακίνητα (π.χ. μακροχρόνιες μισθώσεις) στην ίδια κλίμακα</span>
                <OtherIncomeInput value={otherIncome} />
              </div>
            </dl>
            <div className="rounded-xl bg-muted/60 p-4 text-sm">
              <div className="mb-2 font-medium">Κλίμακα εισοδήματος από ακίνητα {ctxYear}</div>
              <ul className="grid gap-1 text-[13px] text-muted-foreground">
                {r.individual.scale.map((b, i, all) => (
                  <li key={i}>{i === 0 ? "Έως" : `${formatMoney(all[i - 1].upTo ?? 0)} –`} {b.upTo ? formatMoney(b.upTo) : "και άνω"}: <span className="font-medium text-foreground">{pct(b.rate)}</span></li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">Το ΤΑΚΚ που εισπράξατε ({formatMoney(r.climateFeeCollected)}) αποδίδεται στην ΑΑΔΕ και δεν είναι εισόδημα.</p>
            </div>
          </CardContent>
        </Card>
      )}
      <Card className="overflow-hidden">
        <CardHeader title="Ανά ακίνητο" description="Διαμονές με αναχώρηση μέσα στο έτος, μαζί με μελλοντικές κρατήσεις και ακυρώσεις με πληρωμή." />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-2 font-medium">Ακίνητο · ΑΜΑ</th>
                <th className="px-5 py-2 text-right font-medium">Διαμονές</th>
                <th className="px-5 py-2 text-right font-medium">Νύχτες</th>
                <th className="px-5 py-2 text-right font-medium">Ακαθάριστα</th>
                {business && <th className="px-5 py-2 text-right font-medium">ΦΠΑ</th>}
                <th className="px-5 py-2 text-right font-medium">ΤΑΚΚ που εισπράχθηκε</th>
                <th className="px-5 py-2 text-right font-medium">Προμήθειες πλατφορμών</th>
                {business && <th className="px-5 py-2 text-right font-medium">Έξοδα</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {r.byProperty.map((p) => (
                <tr key={p.propertyId}>
                  <td className="px-5 py-2.5">{p.name}<div className="text-xs text-muted-foreground">{p.ama ?? "Χωρίς ΑΜΑ"}</div></td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{p.stays}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{p.nights}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{formatMoney(p.gross)}</td>
                  {business && <td className="px-5 py-2.5 text-right tabular-nums">{formatMoney(p.vat)}</td>}
                  <td className="px-5 py-2.5 text-right tabular-nums">{formatMoney(p.climateFee)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{formatMoney(p.platformFees)}</td>
                  {business && <td className="px-5 py-2.5 text-right tabular-nums">{formatMoney(p.expenses)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-3 border-b border-border pb-2", strong && "font-semibold")}>
      <dt className={cn(!strong && "text-muted-foreground")}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function Compliance({ o, propertiesCompliance }: { o: Awaited<ReturnType<typeof getTaxOverview>>; propertiesCompliance: { id: string; compliance: unknown }[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {o.compliance.map((p) => (
        <Card key={p.propertyId}>
          <CardHeader
            title={<Link href={`/properties/${p.propertyId}`} className="hover:underline">{p.name}</Link>}
            description={`${p.kind === "DETACHED_HOUSE" ? "Μονοκατοικία" : "Διαμέρισμα"}${p.areaSqm ? ` · ${p.areaSqm} m²` : ""} · ΑΜΑ ${p.ama ?? "λείπει"}`}
            action={<Badge tone={p.insuranceStatus === "OK" && p.missing.length === 0 && p.ama ? "success" : "warning"}>{p.insuranceStatus === "OK" && p.missing.length === 0 && p.ama ? "Συμμορφώνεται" : "Χρειάζεται ενέργεια"}</Badge>}
          />
          <CardContent>
            <ComplianceChecklist propertyId={p.propertyId} compliance={(propertiesCompliance.find((x) => x.id === p.propertyId)?.compliance ?? {}) as Record<string, boolean | string | null>} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
