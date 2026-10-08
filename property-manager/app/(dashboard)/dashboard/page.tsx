import { BedDouble, Building2, Euro, LogIn, LogOut, Percent } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AIPreview } from "@/components/dashboard/ai-preview";
import { AttentionList } from "@/components/dashboard/attention-list";
import { SavingsCard } from "@/components/dashboard/savings-card";
import { PriceSuggestionList } from "@/components/properties/price-suggestions";
import { TodayAgenda } from "@/components/dashboard/today-agenda";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader, Stat } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { formatDay, formatMoney, formatPercent } from "@/lib/format";
import { getDashboard } from "@/lib/services/dashboard";

export const metadata: Metadata = { title: "Πίνακας ελέγχου" };

function greeting(now: Date) {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: process.env.NEXT_PUBLIC_APP_TIMEZONE || "Europe/Athens" }).format(now));
  return h < 12 ? "Καλημέρα" : h < 18 ? "Καλησπέρα" : "Καλό βράδυ";
}

export default async function DashboardPage() {
  const { ctx } = await getPageContext();
  const d = await getDashboard(ctx);
  const s = d.summary;
  return (
    <>
      <PageHeader
        title={greeting(new Date())}
        description={`${formatDay(d.today, { weekday: "long", day: "numeric", month: "long" })} · ${d.attention.length ? `${d.attention.length} ${d.attention.length > 1 ? "θέματα χρειάζονται" : "θέμα χρειάζεται"} την προσοχή σας` : "όλα είναι εντάξει"}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/tasks?new=1">Νέα εργασία</Link>
            </Button>
            <Button asChild>
              <Link href="/reservations?new=1">Νέα κράτηση</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
        <Stat label="Ακίνητα" value={s.activeProperties} hint={`${s.properties} συνολικά`} icon={<Building2 />} />
        <Stat label="Φιλοξενούνται" value={s.activeReservations} hint="διαμονές απόψε" icon={<BedDouble />} />
        <Stat label="Αφίξεις" value={s.checkInsToday} hint="σήμερα" icon={<LogIn />} />
        <Stat label="Αναχωρήσεις" value={s.checkOutsToday} hint="σήμερα" icon={<LogOut />} />
        <Stat label="Έσοδα" value={formatMoney(s.monthlyRevenue, s.currency, { compact: true })} hint="αυτόν τον μήνα" icon={<Euro />} />
        <Stat label="Πληρότητα" value={formatPercent(s.occupancy)} hint="αυτόν τον μήνα" icon={<Percent />} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 grid-cols-1 content-start gap-6">
          <Card>
            <CardHeader
              title="Χρειάζονται προσοχή"
              description="Τακτοποιήστε τα για να κυλούν ομαλά οι διαμονές"
              action={d.attention.length > 0 && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">{d.attention.length}</span>}
            />
            <CardContent>
              <AttentionList items={d.attention} />
            </CardContent>
          </Card>
          {d.priceIdeas.length > 0 && (
            <Card>
              <CardHeader title="Προτάσεις τιμών" description="Από τα κενά και την πληρότητα των επόμενων εβδομάδων" />
              <CardContent>
                <PriceSuggestionList items={d.priceIdeas} showProperty />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader title={`Τι σας γλίτωσε η εφαρμογή το ${d.savings.year}`} description="Από τα δικά σας δεδομένα· οι ώρες είναι συντηρητική εκτίμηση" />
            <CardContent>
              <SavingsCard s={d.savings} />
            </CardContent>
          </Card>
          <AIPreview />
        </div>
        <Card className="min-w-0">
          <CardHeader title="Σήμερα" description={formatDay(d.today, { weekday: "long", day: "numeric", month: "short" })} action={<Button asChild variant="ghost" size="sm"><Link href="/calendar">Ημερολόγιο →</Link></Button>} />
          <CardContent>
            <TodayAgenda agenda={d.todayAgenda} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
