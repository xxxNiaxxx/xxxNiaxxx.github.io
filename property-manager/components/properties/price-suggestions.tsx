import { CalendarMinus, Clock, Coins, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { PriceSuggestion, SuggestionKind } from "@/lib/services/price-suggestions";

const ICONS: Record<SuggestionKind, typeof Coins> = {
  GAP: CalendarMinus,
  LAST_MINUTE: Clock,
  HIGH_DEMAND: TrendingUp,
  LOW_DEMAND: TrendingDown,
  ACHIEVED_RATE: Coins,
};

/** Price ideas from the calendar (the price itself is changed on each platform). */
export function PriceSuggestionList({ items, showProperty = false }: { items: PriceSuggestion[]; showProperty?: boolean }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">Καμία πρόταση αυτή τη στιγμή — το ημερολόγιο είναι ισορροπημένο.</p>;
  return (
    <ul className="grid gap-3">
      {items.map((s, i) => {
        const Icon = ICONS[s.kind];
        return (
          <li key={i} className="flex items-start gap-3 text-sm">
            <span className="mt-0.5 rounded-lg bg-accent-soft p-1.5 text-accent"><Icon className="size-4" /></span>
            <div className="min-w-0 flex-1">
              <div className="font-medium">
                {showProperty && <Link href={`/properties/${s.propertyId}`} className="hover:underline">{s.propertyName}: </Link>}
                {s.title}
              </div>
              <div className="text-[13px] text-muted-foreground">{s.detail}</div>
            </div>
            {s.price !== undefined && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums">{s.price} €</span>}
          </li>
        );
      })}
    </ul>
  );
}
