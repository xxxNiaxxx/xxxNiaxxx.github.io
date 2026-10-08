import { Plus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { GuestFormDialog } from "@/components/guests/guest-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/filters";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { formatDay, formatMoney } from "@/lib/format";
import { listGuests } from "@/lib/services/guests";

export const metadata: Metadata = { title: "Guests" };

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default async function GuestsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { ctx } = await getPageContext();
  const { q } = await searchParams;
  const guests = await listGuests(ctx, { q: q?.slice(0, 100) });

  return (
    <>
      <PageHeader title="Guests" description="Everyone who has stayed or will stay with you" actions={<GuestFormDialog trigger={<Button><Plus /> New guest</Button>} />} />
      <div className="mb-5">
        <SearchInput placeholder="Search name, email, phone or country" />
      </div>
      <Card className="overflow-hidden">
        {guests.length === 0 ? (
          <EmptyState icon={<Users />} title={q ? `No guests match “${q}”` : "No guests yet"} description={q ? undefined : "Guests are added when you create reservations, or manually here."} />
        ) : (
          <ul className="divide-y divide-border">
            {guests.map((g) => (
              <li key={g.id}>
                <Link href={`/guests/${g.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{initials(g.fullName)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{g.fullName}</div>
                    <div className="truncate text-xs text-muted-foreground">{[g.email, g.phone, g.country].filter(Boolean).join(" · ") || "No contact details"}</div>
                  </div>
                  <div className="hidden text-right text-xs text-muted-foreground sm:block">
                    <div className="text-sm font-medium text-foreground tabular-nums">{formatMoney(g.totalRevenue)}</div>
                    {g.stays} stay{g.stays === 1 ? "" : "s"}{g.lastStay ? ` · last ${formatDay(g.lastStay, { month: "short", year: "numeric" })}` : ""}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
