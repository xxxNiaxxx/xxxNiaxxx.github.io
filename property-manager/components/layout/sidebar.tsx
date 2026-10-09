"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building, LogOut, UserRound } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";
import { FeedbackDialog } from "./feedback-dialog";
import { Logo } from "./logo";
import { adminFeedbackNav, adminNav, helpNav, isActive, mainNav, settingsNav, type NavItem } from "./nav";

function NavLink({ item, pathname, badge }: { item: NavItem; pathname: string; badge?: number }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-surface text-foreground shadow-[var(--shadow-card)] ring-1 ring-border" : "text-muted-foreground hover:bg-surface/70 hover:text-foreground",
      )}
    >
      <item.icon className={cn("size-[18px]", active ? "text-accent" : "text-subtle-foreground group-hover:text-muted-foreground")} />
      <span className="flex-1">{item.label}</span>
      {badge ? (
        <span className="rounded-full bg-warning-soft px-1.5 text-[11px] font-semibold text-warning tabular-nums ring-1 ring-warning/20">{badge}</span>
      ) : null}
    </Link>
  );
}

export function Sidebar({
  appName,
  orgName,
  userName,
  userEmail,
  pendingActions,
  waitlistAdmin,
}: {
  appName: string;
  orgName: string;
  userName: string;
  userEmail: string;
  pendingActions: number;
  waitlistAdmin?: { pending: number };
}) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh print:!hidden w-64 shrink-0 flex-col border-r border-border bg-muted/60 px-3 py-4 lg:flex">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2.5 px-2 font-semibold tracking-tight">
        <Logo />
        <span className="truncate">{appName}</span>
      </Link>
      <nav className="flex flex-1 flex-col gap-0.5" aria-label="Κύριο μενού">
        {mainNav.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} badge={item.href === "/ai" ? pendingActions : undefined} />
        ))}
      </nav>
      <div className="mt-4 flex flex-col gap-0.5 border-t border-border pt-4">
        {waitlistAdmin && <NavLink item={adminNav} pathname={pathname} badge={waitlistAdmin.pending} />}
        {waitlistAdmin && <NavLink item={adminFeedbackNav} pathname={pathname} />}
        <NavLink item={settingsNav} pathname={pathname} />
        <NavLink item={helpNav} pathname={pathname} />
        <FeedbackDialog />
        <Link href="/settings#organization" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface/70 hover:text-foreground">
          <Building className="size-[18px] text-subtle-foreground" />
          <span className="truncate">{orgName}</span>
        </Link>
        <Link href="/settings#profile" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-surface/70">
          <UserRound className="size-[18px] text-subtle-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{userName}</span>
            <span className="block truncate text-xs text-muted-foreground">{userEmail}</span>
          </span>
        </Link>
        <form action={logoutAction}>
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-surface/70 hover:text-foreground">
            <LogOut className="size-[18px] text-subtle-foreground" /> Αποσύνδεση
          </button>
        </form>
      </div>
    </aside>
  );
}
