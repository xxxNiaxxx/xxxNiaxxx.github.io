import { AlertTriangle, Download, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DeclareButton, FilingButton, NotRequiredButton, OtherIncomeInput, RegimeSelect } from "@/components/tax/actions";
import { ComplianceChecklist } from "@/components/tax/compliance-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState, LinkTabs, PageHeader, Stat } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { formatDay, formatMoney } from "@/lib/format";
import { hasRole } from "@/lib/permissions";
import { getAnnualReport, getTaxOverview } from "@/lib/services/tax";
import { db } from "@/lib/db";
import { LAST_REVIEWED, SOURCES } from "@/lib/tax/gr";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tax & AADE" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const periodLabel = (p: string) => `${MONTHS[Number(p.slice(5)) - 1]} ${p.slice(0, 4)}`;
const pct = (r: number) => `${Math.round(r * 100)}%`;

export default async function TaxPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { ctx } = await getPageContext();
  const sp = await searchParams;
  const tab = ["obligations", "annual", "compliance"].includes(sp.tab) ? sp.tab : "obligations";
  const o = await getTaxOverview(ctx);
  const year = Number(sp.year) >= 2018 && Number(sp.year) <= 2100 ? Number(sp.year) : Number(o.today.slice(0, 4));
  const otherIncome = Math.max(0, Number(sp.otherIncome) || 0);
  const business = o.regime === "BUSINESS";

  return (
    <>
      <PageHeader
        title="Tax & AADE"
        description="Greek short-term rental obligations: stay declarations, climate fee (ΤΑΚΚ), income tax and compliance"
        actions={
          <>
            <Button asChild variant="outline"><a href={`/api/tax/export?type=stays&year=${year}`}><Download /> Stays CSV {year}</a></Button>
            <Button asChild variant="outline"><a href={`/api/tax/export?type=annual&year=${year}`}><Download /> Annual CSV {year}</a></Button>
          </>
        }
      />

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Tax regime:</span>
          <Badge tone={business ? "accent" : "info"}>{business ? "Business (έναρξη εργασιών)" : "Individual (property income)"}</Badge>
          <span className="text-muted-foreground">· {o.propertiesWithAma} propert{o.propertiesWithAma === 1 ? "y" : "ies"} with AMA</span>
        </div>
        <RegimeSelect value={o.regimeSetting} disabled={!hasRole(ctx, "ADMIN")} />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Declarations due" value={o.totals.declarationsDue} hint={o.totals.declarationsOverdue ? `${o.totals.declarationsOverdue} overdue` : "none overdue"} />
        <Stat label="ΤΑΚΚ not filed" value={formatMoney(o.totals.climateFeeUnfiled)} hint="closed months" />
        <Stat label="Properties without AMA" value={o.compliance.filter((c) => !c.ama).length} />
        <Stat label="Insurance issues" value={o.compliance.filter((c) => c.insuranceStatus !== "OK").length} hint="missing / expiring" />
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
            { key: "obligations", label: "Obligations", href: "/tax", count: o.totals.declarationsDue },
            { key: "annual", label: `Annual ${business ? "summary" : "Ε2"}`, href: `/tax?tab=annual&year=${year}` },
            { key: "compliance", label: "Compliance", href: "/tax?tab=compliance" },
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
            Calculations follow the rules in force on {formatDay(LAST_REVIEWED, { day: "numeric", month: "long", year: "numeric" })} and are an aid, not tax advice — confirm amounts with your accountant before filing.
            Sources:{" "}
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
        <CardHeader title="Stay declarations (Δήλωση Βραχυχρόνιας Διαμονής)" description="One per stay, in myAADE, by the 20th of the month after check-out (or after a paid cancellation). Late filing: €100 fine." />
        {o.pendingDeclarations.length === 0 ? (
          <EmptyState title="All stays are declared" description="Stays appear here after check-out." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border text-left text-xs text-muted-foreground">
                  <th className="px-5 py-2 font-medium">Guest</th>
                  <th className="px-5 py-2 font-medium">Property · AMA</th>
                  <th className="px-5 py-2 font-medium">Stay</th>
                  <th className="px-5 py-2 text-right font-medium">Amount</th>
                  <th className="px-5 py-2 font-medium">Deadline</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {o.pendingDeclarations.map((s) => (
                  <tr key={s.reservationId}>
                    <td className="px-5 py-2.5">
                      <Link href={`/reservations/${s.reservationId}`} className="font-medium hover:underline">{s.guestName}</Link>
                      {s.status === "CANCELLED" && <div className="text-xs text-muted-foreground">Paid cancellation</div>}
                    </td>
                    <td className="px-5 py-2.5">{s.propertyName}<div className="text-xs text-muted-foreground">{s.ama ?? <span className="text-danger">No AMA</span>}</div></td>
                    <td className="px-5 py-2.5 whitespace-nowrap">{formatDay(s.checkIn, { day: "numeric", month: "short" })} → {formatDay(s.checkOut, { day: "numeric", month: "short" })}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{formatMoney(s.totalAmount)}</td>
                    <td className="px-5 py-2.5 whitespace-nowrap">
                      <Badge tone={s.declaration.overdue ? "danger" : s.declaration.daysLeft <= 7 ? "warning" : "neutral"}>
                        {s.declaration.overdue ? "Overdue · " : ""}{formatDay(s.declaration.deadline, { day: "numeric", month: "short" })}
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
          title={business ? "Monthly returns: ΤΑΚΚ, VAT and presence fee" : "Climate resilience fee (ΤΑΚΚ) — monthly return"}
          description={`Per night per property: €8 Apr–Oct / €2 Nov–Mar; detached houses over 80 m²: €15 / €4. Filed in myAADE by the last day of the following month (reference month: check-out).${business ? " VAT 13% and the 0.5% presence fee are extracted from each stay's total." : ""}`}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-2 font-medium">Month</th>
                <th className="px-5 py-2 text-right font-medium">Stays</th>
                <th className="px-5 py-2 text-right font-medium">Nights</th>
                <th className="px-5 py-2 text-right font-medium">Gross</th>
                <th className="px-5 py-2 text-right font-medium">ΤΑΚΚ</th>
                <th className="px-5 py-2 font-medium">Due</th>
                {business && <th className="px-5 py-2 text-right font-medium">VAT</th>}
                {business && <th className="px-5 py-2 text-right font-medium">Presence fee</th>}
                <th className="px-5 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {o.monthly.filter((m) => m.stays > 0 || m.climateFeeFiled || !m.closed).map((m) => (
                <tr key={m.period} className={cn(!m.closed && "text-muted-foreground")}>
                  <td className="px-5 py-2.5 font-medium whitespace-nowrap">{periodLabel(m.period)}{!m.closed && <span className="ml-1.5 text-xs font-normal">(in progress)</span>}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{m.stays}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{m.nights}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{formatMoney(m.gross)}</td>
                  <td className="px-5 py-2.5 text-right font-medium tabular-nums">{formatMoney(m.climateFee)}</td>
                  <td className="px-5 py-2.5 whitespace-nowrap">
                    {m.climateFeeFiled ? <Badge tone="success">Filed</Badge> : m.climateFee === 0 ? <span className="text-xs">—</span> : <Badge tone={m.climateFeeOverdue ? "danger" : "neutral"}>{m.climateFeeOverdue ? "Overdue · " : ""}{formatDay(m.climateFeeDeadline, { day: "numeric", month: "short" })}</Badge>}
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
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Revenue ex VAT" value={formatMoney(r.business.revenueExVat)} />
          <Stat label="VAT 13%" value={formatMoney(r.business.vat)} />
          <Stat label="Presence fee 0.5%" value={formatMoney(r.business.presenceFee)} />
          <Stat label="Profit before tax" value={formatMoney(r.business.profitBeforeTax)} hint={`after ${formatMoney(r.business.expenses)} recorded expenses`} />
        </div>
      ) : (
        <Card>
          <CardHeader title={`Ε2 estimate — income year ${ctxYear}`} description="Individuals: gross rent is taxed as property income with a flat 5% deduction; actual expenses, cleaning and platform commissions are not deductible." />
          <CardContent className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <dl className="grid gap-2 text-sm">
              <Row label="Gross rent (booked stays)" value={formatMoney(r.individual.gross)} />
              <Row label="− Flat deduction 5%" value={formatMoney(r.individual.deduction)} />
              <Row label="Taxable" value={formatMoney(r.individual.taxable)} strong />
              <Row label="Estimated income tax" value={formatMoney(r.individual.estimatedTax)} strong />
              <div className="mt-2 flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
                <span>Other property income (other rentals) already using the scale</span>
                <OtherIncomeInput value={otherIncome} />
              </div>
            </dl>
            <div className="rounded-xl bg-muted/60 p-4 text-sm">
              <div className="mb-2 font-medium">Rental income scale {ctxYear}</div>
              <ul className="grid gap-1 text-[13px] text-muted-foreground">
                {r.individual.scale.map((b, i, all) => (
                  <li key={i}>{i === 0 ? "Up to" : `${formatMoney(all[i - 1].upTo ?? 0)} –`} {b.upTo ? formatMoney(b.upTo) : "and above"}: <span className="font-medium text-foreground">{pct(b.rate)}</span></li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">The climate fee you collected ({formatMoney(r.climateFeeCollected)}) is passed to AADE and is not income.</p>
            </div>
          </CardContent>
        </Card>
      )}
      <Card className="overflow-hidden">
        <CardHeader title="Per property" description="Stays with check-out in the year, including upcoming booked stays and paid cancellations." />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-2 font-medium">Property · AMA</th>
                <th className="px-5 py-2 text-right font-medium">Stays</th>
                <th className="px-5 py-2 text-right font-medium">Nights</th>
                <th className="px-5 py-2 text-right font-medium">Gross</th>
                {business && <th className="px-5 py-2 text-right font-medium">VAT</th>}
                <th className="px-5 py-2 text-right font-medium">ΤΑΚΚ collected</th>
                <th className="px-5 py-2 text-right font-medium">Platform fees</th>
                {business && <th className="px-5 py-2 text-right font-medium">Expenses</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {r.byProperty.map((p) => (
                <tr key={p.propertyId}>
                  <td className="px-5 py-2.5">{p.name}<div className="text-xs text-muted-foreground">{p.ama ?? "No AMA"}</div></td>
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
            description={`${p.kind === "DETACHED_HOUSE" ? "Detached house" : "Apartment"}${p.areaSqm ? ` · ${p.areaSqm} m²` : ""} · AMA ${p.ama ?? "missing"}`}
            action={<Badge tone={p.insuranceStatus === "OK" && p.missing.length === 0 && p.ama ? "success" : "warning"}>{p.insuranceStatus === "OK" && p.missing.length === 0 && p.ama ? "Compliant" : "Action needed"}</Badge>}
          />
          <CardContent>
            <ComplianceChecklist propertyId={p.propertyId} compliance={(propertiesCompliance.find((x) => x.id === p.propertyId)?.compliance ?? {}) as Record<string, boolean | string | null>} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
