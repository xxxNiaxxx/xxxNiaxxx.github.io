import type { Metadata } from "next";
import { DeleteAccount } from "@/components/settings/delete-account";
import { NameForm } from "@/components/settings/name-form";
import { OrgSwitcher } from "@/components/settings/org-switcher";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DefinitionList, PageHeader } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { db } from "@/lib/db";
import { humanize } from "@/lib/format";
import { hasRole } from "@/lib/permissions";
import { listMembers } from "@/lib/services/members";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { ctx, user, organization, role } = await getPageContext();
  const [members, memberships] = await Promise.all([
    listMembers(ctx),
    db.organizationMember.findMany({ where: { userId: user.id }, include: { organization: { select: { id: true, name: true } } } }),
  ]);
  const ai = process.env.AI_API_KEY ? `Connected · ${process.env.AI_MODEL || "gpt-4o-mini"}` : "Offline assistant (no AI_API_KEY)";

  return (
    <>
      <PageHeader title="Settings" description="Profile, organization and team" />
      <div className="grid max-w-3xl gap-6">
        <Card id="profile">
          <CardHeader title="Profile" />
          <CardContent className="grid gap-4">
            <NameForm endpoint="/api/me" label="Your name" initial={user.name ?? ""} success="Profile updated" />
            <DefinitionList items={[{ label: "Email", value: user.email }, { label: "Role", value: humanize(role) }]} />
          </CardContent>
        </Card>
        <Card id="organization">
          <CardHeader title="Organization" description="All data is private to this organization and its members." />
          <CardContent className="grid gap-4">
            <NameForm endpoint="/api/organization" label="Organization name" initial={organization.name} disabled={!hasRole(ctx, "ADMIN")} success="Organization renamed" />
            {memberships.length > 1 && (
              <div className="grid gap-1.5">
                <span className="text-[13px] font-medium">Active organization</span>
                <OrgSwitcher current={organization.id} organizations={memberships.map((m) => m.organization)} />
              </div>
            )}
            <DefinitionList items={[{ label: "AI assistant", value: ai }, { label: "Channels", value: "Manual reservations (Airbnb / Booking.com sync planned)" }]} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Team" description={`${members.length} member${members.length === 1 ? "" : "s"}`} />
          <ul className="divide-y divide-border">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{m.name}{m.userId === user.id && <span className="text-muted-foreground"> (you)</span>}</div>
                  <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                </div>
                <Badge tone={m.role === "OWNER" ? "dark" : m.role === "ADMIN" ? "accent" : "neutral"}>{humanize(m.role)}</Badge>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Delete account" description="Permanently delete your account and, where you are the only member, your organization's data." />
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <a href="/privacy" className="text-[13px] text-muted-foreground underline-offset-4 hover:underline">Privacy policy</a>
            <DeleteAccount />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
