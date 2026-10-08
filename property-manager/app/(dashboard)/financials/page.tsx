import type { Metadata } from "next";
import { TransactionFormDialog } from "@/components/financials/expense-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState, LinkTabs, PageHeader, Stat } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { addDaysISO, monthRange, todayISO } from "@/lib/dates";
import { formatDay, formatMoney, formatPercent, humanize } from "@/lib/format";
import { getRevenueSummary, listTransactions } from "@/lib/services/financials";
import { getFormOptions } from "@/lib/services/options";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Financials" };

function periods(today: string) {
  const thisMonth = monthRange(today);
  const lastMonth = monthRange(addDaysISO(thisMonth.from, -1));
  const nextMonth = monthRange(thisMonth.to);
  return {
    "this-month": { label: "This month", ...thisMonth },
    "last-month": { label: "Last month", ...lastMonth },
    "next-month": { label: "Next month", ...nextMonth },
    ytd: { label: "Year to date", from: `${today.slice(0, 4)}-01-01`, to: addDaysISO(today, 1) },
  } as const;
}

export default async function FinancialsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { ctx } = await getPageContext();
  const today = todayISO();
  const all = periods(today);
  const { period: raw } = await searchParams;
  const key = (raw && raw in all ? raw : "this-month") as keyof typeof all;
  const range = all[key];
  const [s, transactions, options] = await Promise.all([
    getRevenueSummary(ctx, { from: range.from, to: range.to }),
    listTransactions(ctx, { from: range.from, to: range.to }),
    getFormOptions(ctx),
  ]);
  const maxNet = Math.max(1, ...s.byProperty.map((p) => Math.abs(p.net)));

  return (
    <>
      <PageHeader
        title="Financials"
        description={`${formatDay(s.from, { day: "numeric", month: "short", year: "numeric" })} – ${formatDay(addDaysISO(s.to, -1), { day: "numeric", month: "short", year: "numeric" })}`}
        actions={<TransactionFormDialog properties={options.properties} today={today} />}
      />
      <div className="mb-5">
        <LinkTabs active={key} tabs={Object.entries(all).map(([k, v]) => ({ key: k, label: v.label, href: `/financials?period=${k}` }))} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Income" value={formatMoney(s.income, s.currency)} />
        <Stat label="Expenses" value={formatMoney(s.expenses, s.currency)} />
        <Stat label="Net" value={<span className={cn(s.net < 0 && "text-danger")}>{formatMoney(s.net, s.currency)}</span>} />
        <Stat label="Occupancy" value={formatPercent(s.occupancy)} hint={`${s.bookedNights} of ${s.availableNights} nights`} />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="By property" description="Ranked by net income" />
          <CardContent className="grid gap-4">
            {s.byProperty.map((p, i) => (
              <div key={p.propertyId}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{i === 0 && s.net > 0 && <span className="mr-1.5 text-accent">★</span>}{p.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatMoney(p.net, s.currency)}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", p.net >= 0 ? "bg-accent" : "bg-danger")} style={{ width: `${(Math.abs(p.net) / maxNet) * 100}%` }} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Income {formatMoney(p.income, s.currency)} · Expenses {formatMoney(p.expenses, s.currency)} · Occupancy {formatPercent(p.occupancy)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="By category" />
          <CardContent>
            {s.byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions in this period.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  {s.byCategory.map((c) => (
                    <tr key={c.category}>
                      <td className="py-2">{humanize(c.category)}</td>
                      <td className="py-2 text-right tabular-nums text-success">{c.income ? `+${formatMoney(c.income, s.currency)}` : ""}</td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">{c.expenses ? `−${formatMoney(c.expenses, s.currency)}` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6 overflow-hidden">
        <CardHeader title="Transactions" description={`${transactions.length} in this period`} />
        {transactions.length === 0 ? (
          <EmptyState title="No transactions in this period" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border text-left text-xs text-muted-foreground">
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-5 py-2 font-medium">Property</th>
                  <th className="px-5 py-2 font-medium">Category</th>
                  <th className="hidden px-5 py-2 font-medium sm:table-cell">Description</th>
                  <th className="px-5 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="px-5 py-2.5 whitespace-nowrap">{formatDay(t.transactionDate, { day: "numeric", month: "short" })}</td>
                    <td className="px-5 py-2.5 whitespace-nowrap">{t.propertyName}</td>
                    <td className="px-5 py-2.5">{humanize(t.category)}</td>
                    <td className="hidden px-5 py-2.5 text-muted-foreground sm:table-cell">{t.description}</td>
                    <td className={cn("px-5 py-2.5 text-right font-medium whitespace-nowrap tabular-nums", t.type === "INCOME" ? "text-success" : "")}>
                      {t.type === "INCOME" ? "+" : "−"}{formatMoney(t.amount, t.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
