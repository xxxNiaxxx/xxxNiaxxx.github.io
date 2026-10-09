import Link from "next/link";
import { SOURCE_LABELS } from "@/components/ui/status";
import { formatMoney } from "@/lib/format";
import { commissionBase } from "@/lib/tax/gr";
import type { getStayTax } from "@/lib/services/tax";
import { cn } from "@/lib/utils";

type StayTax = Awaited<ReturnType<typeof getStayTax>>;

const pct = (rate: number) => `${(Math.round(rate * 1000) / 10).toLocaleString("el-GR")}%`;

/** From what the guest pays to what is left for the owner, like Booking's "Ανάλυση τιμής". */
export function PriceBreakdown({ tax, source }: { tax: StayTax; source: string }) {
  const Row = ({ label, value, sub, strong, minus }: { label: string; value: number | null; sub?: string; strong?: boolean; minus?: boolean }) => (
    <div className={cn("flex items-start justify-between gap-3", strong && "font-semibold")}>
      <div>
        <div className={cn(!strong && "text-muted-foreground")}>{label}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
      <div className="shrink-0 tabular-nums">{value === null ? "—" : `${minus && value > 0 ? "− " : ""}${formatMoney(value)}`}</div>
    </div>
  );
  const nights = tax.climateFeeMonths.reduce((a, m) => a + m.nights, 0);
  return (
    <div className="grid gap-2.5">
      <Row label="Τιμή δωματίου" value={tax.totalAmount} sub={tax.regime === "BUSINESS" ? "Περιλαμβάνει ΦΠΑ 13% και τέλος 0,5%" : undefined} />
      <Row label="ΤΑΚΚ (τέλος ανθεκτικότητας)" value={tax.climateFee} sub={nights ? `${nights} νύχτες · ${tax.climateFeeMonths.map((m) => `${m.period}: ${formatMoney(m.amount)}`).join(" · ")}` : undefined} />
      <Row label="Πληρωμή επισκέπτη" value={tax.guestTotal} strong />
      <div className="my-1 border-t border-border" />
      <Row label="ΤΑΚΚ — αποδίδεται στην ΑΑΔΕ" value={tax.climateFee} minus />
      {tax.regime === "BUSINESS" && (
        <>
          <Row label="ΦΠΑ 13%" value={tax.vat} minus />
          <Row label="Τέλος παρεπιδημούντων 0,5%" value={tax.presenceFee} minus />
        </>
      )}
      <Row label={`Προμήθεια ${SOURCE_LABELS[source] ?? ""}`.trim()} value={tax.commission} minus
        sub={tax.commissionRate ? `${tax.commissionRate}% πάνω σε ${formatMoney(commissionBase(tax.totalAmount, source))}${source === "BOOKING_COM" ? " (τιμή χωρίς το τέλος 0,5%)" : ""}` : undefined} />
      {tax.paymentFee > 0 && (
        <Row label={`Χρέωση υπηρεσίας πληρωμών ${SOURCE_LABELS[source] ?? ""}`.trim()} value={tax.paymentFee} minus
          sub={`${tax.paymentFeeRate}% πάνω σε ${formatMoney(tax.guestTotal)} (πληρωμή επισκέπτη)`} />
      )}
      <Row label="Φόρος εισοδήματος (εκτίμηση)" value={tax.incomeTax} minus
        sub={tax.incomeTaxRate !== null ? `${pct(tax.incomeTaxRate)} — ${tax.regime === "BUSINESS" ? "πάνω στο κέρδος (μίσθωμα χωρίς ΦΠΑ − προμήθεια)" : "μέσος συντελεστής Ε2 του έτους, στο μίσθωμα − 5%"}` : undefined} />
      <div className="my-1 border-t border-border" />
      <Row label="Καθαρά στον ιδιοκτήτη" value={tax.net} strong />
      <Link href="/help#poso-kratisis" className="mt-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Πώς υπολογίζονται;</Link>
    </div>
  );
}
