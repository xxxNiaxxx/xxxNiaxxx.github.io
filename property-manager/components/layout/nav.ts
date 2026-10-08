import {
  Building2,
  CalendarDays,
  ClipboardList,
  Landmark,
  LayoutDashboard,
  type LucideIcon,
  NotebookTabs,
  Settings,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/reservations", label: "Reservations", icon: NotebookTabs },
  { href: "/guests", label: "Guests", icon: Users },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/financials", label: "Financials", icon: Wallet },
  { href: "/tax", label: "Tax & AADE", icon: Landmark },
  { href: "/ai", label: "AI Assistant", icon: Sparkles },
];

export const settingsNav: NavItem = { href: "/settings", label: "Settings", icon: Settings };

/** Mobile bottom bar: Home, Calendar, Tasks, AI (+ "More" menu). */
export const mobileNav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/ai", label: "AI", icon: Sparkles },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
