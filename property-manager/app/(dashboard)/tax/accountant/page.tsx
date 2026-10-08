import { Download } from "lucide-react";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { LinkTabs, PageHeader } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { todayISO } from "@/lib/dates";
import { accountantPack } from "@/lib/services/accountant";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Φάκελος για τον λογιστή" };

const fmt = (v: string | number | null) =>
  v == null ? "" : typeof v === "number" ? v.toLocaleString("el-GR", { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 }) : v;

export default async function AccountantPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { ctx } = await getPageContext();
  const current = Number(todayISO().slice(0, 4));
  const year = Number((await searchParams).year) || current;
  const pack = await accountantPack(ctx, year);

  return (
    <div className="print:text-[11px]">
      <div className="print:hidden">
        <PageHeader
          back={{ href: "/tax", label: "Φορολογικά" }}
          title="Φάκελος για τον λογιστή"
          description="Όλη η χρονιά ανά ΑΜΑ: έσοδα, ΤΑΚΚ ανά μήνα, διαμονές και έξοδα — για εκτύπωση, PDF ή Excel."
          actions={
            <>
              <PrintButton />
              <Button asChild variant="outline"><a href={`/api/tax/accountant?year=${year}`}><Download /> Excel</a></Button>
            </>
          }
        />
        <div className="mb-6">
          <LinkTabs active={String(year)} tabs={[current - 1, current].map((y) => ({ key: String(y), label: String(y), href: `/tax/accountant?year=${y}` }))} />
        </div>
      </div>
      <h1 className="hidden text-lg font-semibold print:block">{pack.organization} — Φάκελος {year}</h1>
      <div className="grid gap-8">
        {pack.sheets.map((s) => (
          <section key={s.name} className="break-inside-avoid-page">
            <h2 className="mb-2 text-base font-semibold">{s.title}</h2>
            {s.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Δεν υπάρχουν εγγραφές.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border print:overflow-visible print:rounded-none print:border-0">
                <table className="w-full text-[13px] print:text-[10px]">
                  <thead className="bg-muted/60 text-left">
                    <tr>{s.header.map((h) => <th key={h} className="px-3 py-2 font-medium whitespace-nowrap print:px-1">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {s.rows.map((r, i) => (
                      <tr key={i}>{r.map((c, j) => <td key={j} className={`px-3 py-1.5 print:px-1 ${typeof c === "number" ? "text-right tabular-nums" : ""}`}>{fmt(c)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
      <p className="mt-8 text-xs text-muted-foreground">Οι φόροι είναι εκτίμηση της εφαρμογής· τα ποσά προέρχονται από τις κρατήσεις και τα έξοδα που καταχωρίσατε.</p>
    </div>
  );
}
