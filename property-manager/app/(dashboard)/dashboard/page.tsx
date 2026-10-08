import { BedDouble, Building2, Euro, LogIn, LogOut, Percent } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AIPreview } from "@/components/dashboard/ai-preview";
import { AttentionList } from "@/components/dashboard/attention-list";
import { TodayAgenda } from "@/components/dashboard/today-agenda";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader, Stat } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { formatDay, formatMoney, formatPercent } from "@/lib/format";
import { getDashboard } from "@/lib/services/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

function greeting(now: Date) {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: process.env.NEXT_PUBLIC_APP_TIMEZONE || "Europe/Athens" }).format(now));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const { ctx, user } = await getPageContext();
  const d = await getDashboard(ctx);
  const s = d.summary;
  const firstName = (user.name ?? "").split(" ")[0];
  return (
    <>
      <PageHeader
        title={`${greeting(new Date())}${firstName ? `, ${firstName}` : ""}`}
        description={`${formatDay(d.today, { weekday: "long", day: "numeric", month: "long" })} · ${d.attention.length ? `${d.attention.length} thing${d.attention.length > 1 ? "s" : ""} need${d.attention.length > 1 ? "" : "s"} your attention` : "you're all caught up"}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/tasks?new=1">New task</Link>
            </Button>
            <Button asChild>
              <Link href="/reservations?new=1">New reservation</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
        <Stat label="Properties" value={s.activeProperties} hint={`${s.properties} total`} icon={<Building2 />} />
        <Stat label="In-house" value={s.activeReservations} hint="active stays tonight" icon={<BedDouble />} />
        <Stat label="Check-ins" value={s.checkInsToday} hint="today" icon={<LogIn />} />
        <Stat label="Check-outs" value={s.checkOutsToday} hint="today" icon={<LogOut />} />
        <Stat label="Revenue" value={formatMoney(s.monthlyRevenue, s.currency, { compact: true })} hint="this month" icon={<Euro />} />
        <Stat label="Occupancy" value={formatPercent(s.occupancy)} hint="this month" icon={<Percent />} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="grid min-w-0 content-start gap-6">
          <Card>
            <CardHeader
              title="Needs attention"
              description="Resolve these to keep stays running smoothly"
              action={d.attention.length > 0 && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">{d.attention.length}</span>}
            />
            <CardContent>
              <AttentionList items={d.attention} />
            </CardContent>
          </Card>
          <AIPreview />
        </div>
        <Card>
          <CardHeader title="Today" description={formatDay(d.today, { weekday: "long", day: "numeric", month: "short" })} action={<Button asChild variant="ghost" size="sm"><Link href="/calendar">Calendar →</Link></Button>} />
          <CardContent>
            <TodayAgenda agenda={d.todayAgenda} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
