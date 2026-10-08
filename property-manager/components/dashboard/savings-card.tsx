import { CalendarX2, Clock, FileCheck2, PiggyBank } from "lucide-react";
import type { SavingsReport } from "@/lib/services/savings";

/** "What the app saved you this year" — every figure from the team's own data. */
export function SavingsCard({ s }: { s: SavingsReport }) {
  const tiles = [
    { icon: FileCheck2, value: `${s.finesAvoided.toLocaleString("el-GR")} €`, label: "πρόστιμα που αποφύγατε", hint: `${s.declarationsOnTime} δηλώσεις διαμονής εμπρόθεσμα (100 € η εκπρόθεσμη)` },
    { icon: PiggyBank, value: `${s.commissionSaved.toLocaleString("el-GR")} €`, label: "προμήθειες που γλιτώσατε", hint: `${s.directBookings} απευθείας κρατήσεις από τη σελίδα σας` },
    { icon: CalendarX2, value: String(s.doubleBookingsCaught), label: "πιθανές διπλοκρατήσεις", hint: "εντοπίστηκαν από τα ημερολόγια" },
    { icon: Clock, value: `${s.hoursSaved.toLocaleString("el-GR")} ${s.hoursSaved === 1 ? "ώρα" : "ώρες"}`, label: "δουλειάς λιγότερη", hint: `${s.automatedStays} κρατήσεις αυτόματα · ${s.checkinsCompleted} online check-in · ${s.aiReplies} απαντήσεις AI` },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {tiles.map((t) => (
        <div key={t.label} className="flex items-start gap-3 rounded-xl border border-border p-3">
          <span className="rounded-lg bg-success-soft p-1.5 text-success"><t.icon className="size-4" /></span>
          <div className="min-w-0">
            <div className="text-lg font-semibold tabular-nums">{t.value}</div>
            <div className="text-[13px]">{t.label}</div>
            <div className="text-xs text-muted-foreground">{t.hint}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
