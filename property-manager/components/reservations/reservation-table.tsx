import Link from "next/link";
import { StatusBadge, SOURCE_LABELS } from "@/components/ui/status";
import { formatDay, formatMoney } from "@/lib/format";
import type { ReservationDTO } from "@/lib/services/serializers";

/** Responsive reservation list: table on desktop, cards on mobile. */
export function ReservationTable({ reservations, hideProperty, hideGuest }: { reservations: ReservationDTO[]; hideProperty?: boolean; hideGuest?: boolean }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              {!hideGuest && <th className="px-5 py-2.5 font-medium">Επισκέπτης</th>}
              {!hideProperty && <th className="px-5 py-2.5 font-medium">Ακίνητο</th>}
              <th className="px-5 py-2.5 font-medium">Ημερομηνίες</th>
              <th className="px-5 py-2.5 font-medium">Πηγή</th>
              <th className="px-5 py-2.5 font-medium">Κατάσταση</th>
              <th className="px-5 py-2.5 text-right font-medium">Σύνολο</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reservations.map((r) => (
              <tr key={r.id} className="group relative hover:bg-muted/40">
                {!hideGuest && (
                  <td className="px-5 py-3">
                    <Link href={`/reservations/${r.id}`} className="font-medium after:absolute after:inset-0">
                      {r.guestName}
                    </Link>
                    <div className="text-xs text-muted-foreground">{r.confirmationCode ?? <span className="text-warning">Χωρίς κωδικό κράτησης</span>}</div>
                  </td>
                )}
                {!hideProperty && (
                  <td className="px-5 py-3">
                    {hideGuest ? (
                      <Link href={`/reservations/${r.id}`} className="font-medium after:absolute after:inset-0">{r.propertyName}</Link>
                    ) : (
                      r.propertyName
                    )}
                  </td>
                )}
                <td className="px-5 py-3 whitespace-nowrap">
                  {hideGuest && hideProperty ? (
                    <Link href={`/reservations/${r.id}`} className="after:absolute after:inset-0">{formatDay(r.checkIn)} → {formatDay(r.checkOut)}</Link>
                  ) : (
                    <>{formatDay(r.checkIn)} → {formatDay(r.checkOut)}</>
                  )}
                  <div className="text-xs text-muted-foreground">{r.nights} νύχτες · {r.guestsCount} άτομα</div>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{SOURCE_LABELS[r.source]}</td>
                <td className="px-5 py-3"><StatusBadge value={r.status} /></td>
                <td className="px-5 py-3 text-right font-medium tabular-nums">{r.complimentary ? <span className="text-muted-foreground">Δωρεάν</span> : formatMoney(r.totalAmount, r.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-border md:hidden">
        {reservations.map((r) => (
          <li key={r.id}>
            <Link href={`/reservations/${r.id}`} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{hideGuest ? r.propertyName : r.guestName}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {!hideProperty && !hideGuest && `${r.propertyName} · `}
                  {formatDay(r.checkIn)} → {formatDay(r.checkOut)}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-medium tabular-nums">{r.complimentary ? "Δωρεάν" : formatMoney(r.totalAmount, r.currency)}</span>
                <StatusBadge value={r.status} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
