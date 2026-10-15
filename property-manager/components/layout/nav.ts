import {
  Building2,
  CircleHelp,
  Inbox,
  MessagesSquare,
  MessageSquareText,
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
  Bug,
  CreditCard,
  Activity,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Πίνακας ελέγχου", icon: LayoutDashboard },
  { href: "/calendar", label: "Ημερολόγιο", icon: CalendarDays },
  { href: "/properties", label: "Ακίνητα", icon: Building2 },
  { href: "/reservations", label: "Κρατήσεις", icon: NotebookTabs },
  { href: "/guests", label: "Επισκέπτες", icon: Users },
  { href: "/tasks", label: "Εργασίες", icon: ClipboardList },
  { href: "/financials", label: "Οικονομικά", icon: Wallet },
  { href: "/tax", label: "Φορολογικά & ΑΑΔΕ", icon: Landmark },
  { href: "/ai", label: "Βοηθός AI", icon: Sparkles },
];

export const settingsNav: NavItem = { href: "/settings", label: "Ρυθμίσεις", icon: Settings };
export const helpNav: NavItem = { href: "/help", label: "Βοήθεια", icon: CircleHelp };

/** Only for the app's administrators (ADMIN_EMAILS). */
export const adminNav: NavItem = { href: "/admin/waitlist", label: "Λίστα αναμονής", icon: Inbox };
export const adminTemplatesNav: NavItem = { href: "/admin/messages", label: "Πρότυπα μηνυμάτων", icon: MessageSquareText };
export const adminFeedbackNav: NavItem = { href: "/admin/feedback", label: "Σχόλια χρηστών", icon: MessagesSquare };
export const adminOrgsNav: NavItem = { href: "/admin/organizations", label: "Οργανισμοί", icon: Building2 };
export const billingNav: NavItem = { href: "/billing", label: "Συνδρομή", icon: CreditCard };
export const adminErrorsNav: NavItem = { href: "/admin/errors", label: "Σφάλματα", icon: Bug };
export const adminActivityNav: NavItem = { href: "/admin/activity", label: "Χρήστες live", icon: Activity };

/** Mobile bottom bar: Home, Calendar, Tasks, AI (+ "More" menu). */
export const mobileNav: NavItem[] = [
  { href: "/dashboard", label: "Αρχική", icon: LayoutDashboard },
  { href: "/calendar", label: "Ημερολόγιο", icon: CalendarDays },
  { href: "/tasks", label: "Εργασίες", icon: ClipboardList },
  { href: "/ai", label: "AI", icon: Sparkles },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
