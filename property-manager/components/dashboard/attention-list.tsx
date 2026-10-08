import { AlertCircle, CalendarClock, CheckCircle2, ClipboardX, Euro, FileWarning, Landmark, MessageSquareWarning, ShieldAlert, Sparkles } from "lucide-react";
import Link from "next/link";
import type { AttentionItem, AttentionKind } from "@/lib/services/dashboard";
import { cn } from "@/lib/utils";

const icons: Record<AttentionKind, typeof AlertCircle> = {
  OVERDUE_TASK: ClipboardX,
  MISSING_CLEANING: CalendarClock,
  MISSING_INFO: FileWarning,
  NO_CHECKIN_MESSAGE: MessageSquareWarning,
  AI_ACTION: Sparkles,
  TAX_DEADLINE: Landmark,
  COMPLIANCE: ShieldAlert,
  MISSING_AMOUNT: Euro,
};

const severityStyles = {
  high: "bg-danger-soft text-danger",
  medium: "bg-warning-soft text-warning",
  low: "bg-muted text-muted-foreground",
};

export function AttentionList({ items }: { items: AttentionItem[] }) {
  if (!items.length) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-success-soft px-4 py-5 text-sm text-success">
        <CheckCircle2 className="size-5" /> Όλα εντάξει — τίποτα δεν χρειάζεται την προσοχή σας αυτή τη στιγμή.
      </div>
    );
  }
  return (
    <ul className="-mx-2 divide-y divide-border">
      {items.map((item, i) => {
        const Icon = icons[item.kind];
        return (
          <li key={i}>
            <Link href={item.href} className="flex items-start gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60">
              <span className={cn("mt-0.5 rounded-lg p-1.5", severityStyles[item.severity])}>
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{item.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>
              </span>
              {item.severity === "high" && <span className="mt-1 text-[11px] font-semibold text-danger uppercase">Επείγον</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
