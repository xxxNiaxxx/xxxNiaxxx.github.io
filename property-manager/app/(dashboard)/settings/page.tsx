import type { Metadata } from "next";
import { DeleteAccount } from "@/components/settings/delete-account";
import { NameForm } from "@/components/settings/name-form";
import { OrgSwitcher } from "@/components/settings/org-switcher";
import { RemindersToggle } from "@/components/settings/reminders-toggle";
import { TeamPanel } from "@/components/settings/team";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DefinitionList, PageHeader } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { db } from "@/lib/db";
import { humanize } from "@/lib/format";
import { hasRole } from "@/lib/permissions";
import { listInvitations } from "@/lib/services/invitations";
import { listMembers } from "@/lib/services/members";

export const metadata: Metadata = { title: "Ρυθμίσεις" };

export default async function SettingsPage() {
  const { ctx, user, organization, role } = await getPageContext();
  const [members, invitations, memberships] = await Promise.all([
    listMembers(ctx),
    listInvitations(ctx),
    db.organizationMember.findMany({ where: { userId: user.id }, include: { organization: { select: { id: true, name: true } } } }),
  ]);
  const ai = process.env.AI_API_KEY ? `Συνδεδεμένος · ${process.env.AI_MODEL || "gpt-4o-mini"}` : "Βοηθός εκτός σύνδεσης (χωρίς AI_API_KEY)";

  return (
    <>
      <PageHeader title="Ρυθμίσεις" description="Προφίλ, οργανισμός και ομάδα" />
      <div className="grid max-w-3xl gap-6">
        <Card id="profile">
          <CardHeader title="Προφίλ" />
          <CardContent className="grid gap-4">
            <NameForm endpoint="/api/me" label="Το όνομά σας" initial={user.name ?? ""} success="Το προφίλ ενημερώθηκε" />
            <DefinitionList items={[{ label: "Email", value: user.email }, { label: "Ρόλος", value: humanize(role) }]} />
          </CardContent>
        </Card>
        <Card id="organization">
          <CardHeader title="Οργανισμός" description="Τα δεδομένα είναι ιδιωτικά, μόνο για τον οργανισμό και τα μέλη του." />
          <CardContent className="grid gap-4">
            <NameForm endpoint="/api/organization" label="Όνομα οργανισμού" initial={organization.name} disabled={!hasRole(ctx, "ADMIN")} success="Ο οργανισμός μετονομάστηκε" />
            {memberships.length > 1 && (
              <div className="grid gap-1.5">
                <span className="text-[13px] font-medium">Ενεργός οργανισμός</span>
                <OrgSwitcher current={organization.id} organizations={memberships.map((m) => m.organization)} />
              </div>
            )}
            <RemindersToggle initial={organization.emailReminders} disabled={!hasRole(ctx, "ADMIN")} />
            <DefinitionList items={[{ label: "Βοηθός AI", value: ai }, { label: "Κανάλια", value: "Ημερολόγια iCal ανά ακίνητο και εισαγωγή αρχείων κρατήσεων" }]} />
          </CardContent>
        </Card>
        <Card id="team">
          <CardHeader title="Ομάδα" description={`${members.length} ${members.length === 1 ? "μέλος" : "μέλη"}`} />
          <TeamPanel members={members} invitations={invitations} currentUserId={user.id} currentRole={role} />
        </Card>
        <Card>
          <CardHeader title="Διαγραφή λογαριασμού" description="Οριστική διαγραφή του λογαριασμού σας και, όπου είστε το μόνο μέλος, των δεδομένων του οργανισμού." />
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <a href="/privacy" className="text-[13px] text-muted-foreground underline-offset-4 hover:underline">Πολιτική απορρήτου</a>
            <DeleteAccount />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
