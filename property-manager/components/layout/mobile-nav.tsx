"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { adminNav, helpNav, isActive, mainNav, mobileNav, settingsNav } from "./nav";

export function MobileTopBar({ appName, orgName }: { appName: string; orgName: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur lg:hidden">
      <Link href="/dashboard" className="flex min-w-0 items-center gap-2 font-semibold tracking-tight">
        <Logo className="size-6" />
        <span className="truncate">{appName}</span>
      </Link>
      <span className="ml-3 truncate text-xs text-muted-foreground">{orgName}</span>
    </header>
  );
}

export function MobileBottomNav({ pendingActions, waitlistAdmin = false }: { pendingActions: number; waitlistAdmin?: boolean }) {
  const pathname = usePathname();
  const more = [...mainNav.filter((n) => !mobileNav.some((m) => m.href === n.href)), ...(waitlistAdmin ? [adminNav] : []), settingsNav, helpNav];
  return (
    <nav
      aria-label="Μενού κινητού"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {mobileNav.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn("relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-foreground" : "text-muted-foreground")}
          >
            <item.icon className={cn("size-5", active && "text-accent")} />
            {item.label}
            {item.href === "/ai" && pendingActions > 0 && (
              <span className="absolute top-1.5 right-[calc(50%-18px)] size-2 rounded-full bg-warning" />
            )}
          </Link>
        );
      })}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground outline-none">
          <Menu className="size-5" />
          Περισσότερα
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" className="mb-2 w-56">
          <DropdownMenuLabel>Μετάβαση</DropdownMenuLabel>
          {more.map((item) => (
            <DropdownMenuItem key={item.href} asChild>
              <Link href={item.href}>
                <item.icon /> {item.label}
              </Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => logoutAction()}>
            <LogOut /> Αποσύνδεση
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
