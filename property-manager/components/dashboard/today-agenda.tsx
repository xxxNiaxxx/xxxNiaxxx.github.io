import { LogIn, LogOut, Sparkle, Wrench, ListTodo } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status";
import { formatTime } from "@/lib/format";
import type { DashboardData } from "@/lib/services/dashboard";

function Section({ title, icon, count, children }: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <span className="[&_svg]:size-3.5">{icon}</span>
        {title}
        <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums">{count}</span>
      </div>
      {count === 0 ? <p className="pb-2 text-[13px] text-subtle-foreground">None today</p> : <ul className="space-y-1.5">{children}</ul>}
    </div>
  );
}

function Row({ href, primary, secondary, right }: { href: string; primary: string; secondary: string; right?: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:border-border-strong hover:bg-muted/40">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{primary}</span>
          <span className="block truncate text-xs text-muted-foreground">{secondary}</span>
        </span>
        {right}
      </Link>
    </li>
  );
}

export function TodayAgenda({ agenda }: { agenda: DashboardData["todayAgenda"] }) {
  const taskRow = (t: DashboardData["todayAgenda"]["cleaning"][number]) => (
    <Row
      key={t.id}
      href={`/tasks?tab=today`}
      primary={t.title}
      secondary={`${t.propertyName}${t.dueAt ? ` · ${formatTime(t.dueAt)}` : ""}${t.assigneeName ? ` · ${t.assigneeName}` : ""}`}
      right={<StatusBadge value={t.status} />}
    />
  );
  return (
    <div className="grid gap-5">
      <Section title="Check-ins" icon={<LogIn />} count={agenda.checkIns.length}>
        {agenda.checkIns.map((r) => (
          <Row key={r.id} href={`/reservations/${r.id}`} primary={r.guestName ?? "Guest"} secondary={`${r.propertyName} · ${r.guestsCount} guests · ${r.nights} nights`} />
        ))}
      </Section>
      <Section title="Check-outs" icon={<LogOut />} count={agenda.checkOuts.length}>
        {agenda.checkOuts.map((r) => (
          <Row key={r.id} href={`/reservations/${r.id}`} primary={r.guestName ?? "Guest"} secondary={`${r.propertyName}`} />
        ))}
      </Section>
      <Section title="Cleaning" icon={<Sparkle />} count={agenda.cleaning.length}>
        {agenda.cleaning.map(taskRow)}
      </Section>
      <Section title="Maintenance" icon={<Wrench />} count={agenda.maintenance.length}>
        {agenda.maintenance.map(taskRow)}
      </Section>
      <Section title="Other tasks" icon={<ListTodo />} count={agenda.other.length}>
        {agenda.other.map(taskRow)}
      </Section>
    </div>
  );
}
