import { CalendarAutoSync } from "@/components/layout/calendar-auto-sync";
import { MobileBottomNav, MobileTopBar } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { getPageContext } from "@/lib/auth/page";
import { APP_NAME } from "@/lib/brand";
import { db } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/email";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { ctx, user, organization } = await getPageContext();
  const pendingActions = await db.aIAction.count({ where: { organizationId: ctx.organizationId, status: "PROPOSED" } });
  const admin = isPlatformAdmin(user.email);
  const waitlistPending = admin ? await db.waitlistEntry.count({ where: { status: "PENDING" } }) : 0;
  return (
    <div className="flex min-h-dvh">
      <Sidebar
        appName={APP_NAME}
        orgName={organization.name}
        userName={user.name ?? user.email}
        userEmail={user.email}
        pendingActions={pendingActions}
        waitlistAdmin={admin ? { pending: waitlistPending } : undefined}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar appName={APP_NAME} orgName={organization.name} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">{children}</main>
      </div>
      <MobileBottomNav pendingActions={pendingActions} waitlistAdmin={admin} />
      <CalendarAutoSync />
    </div>
  );
}
