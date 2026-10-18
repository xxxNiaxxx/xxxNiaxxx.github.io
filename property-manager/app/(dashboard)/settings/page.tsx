import type { Metadata } from "next";
import { DeleteAccount } from "@/components/settings/delete-account";
import { NameForm } from "@/components/settings/name-form";
import { PushNotifications } from "@/components/settings/push-notifications";
import { OrgSwitcher } from "@/components/settings/org-switcher";
import { RemindersToggle } from "@/components/settings/reminders-toggle";
import { ChangePassword, SignOutEverywhere } from "@/components/settings/security";
import { TeamPanel } from "@/components/settings/team";
import { TwoStep } from "@/components/settings/two-step";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DefinitionList, PageHeader } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { db } from "@/lib/db";
import { isPlatformAdmin } from "@/lib/email";
import { humanize } from "@/lib/format";
import { hasRole } from "@/lib/permissions";
import { listInvitations } from "@/lib/services/invitations";
import { listMembers } from "@/lib/services/members";
import { listExports, listLogins, twoStepStatus } from "@/lib/services/security";

export const metadata: Metadata = { title: "Ρυθμίσεις" };

const when = (iso: string) => new Date(iso).toLocaleString("el-GR", { timeZone: "Europe/Athens", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function ActivityList({ items, empty }: { items: { id: string; title: string; detail: string | null; at: string }[]; empty: string }) {
  if (!items.length) return <p className="text-[13px] text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y divide-border rounded-xl border border-border text-[13px]">
      {items.map((i) => (
        <li key={i.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3 py-2">
          <span>
            <span className="font-medium">{i.title}</span>
            {i.detail && <span className="text-muted-foreground"> · {i.detail}</span>}
          </span>
          <span className="text-muted-foreground tabular-nums">{when(i.at)}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function SettingsPage() {
  const { ctx, user, organization, role } = await getPageContext({ withoutSubscription: true });
  const [members, invitations, memberships, twoStep, logins, exports] = await Promise.all([
    listMembers(ctx),
    listInvitations(ctx),
    db.organizationMember.findMany({ where: { userId: user.id }, include: { organization: { select: { id: true, name: true } } } }),
    twoStepStatus(user.id),
    listLogins(user.id),
    hasRole(ctx, "ADMIN") ? listExports(ctx) : null,
  ]);
  const ai = process.env.AI_API_KEY ? `Συνδεδεμένος · ${process.env.AI_MODEL || "gpt-4o-mini"}` : "Βοηθός εκτός σύνδεσης (χωρίς AI_API_KEY)";

  return (
    <>
      <PageHeader title="Ρυθμίσεις" description="Προφίλ, οργανισμός και ομάδα" />
      <div className="grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-6">
        <Card id="profile">
          <CardHeader title="Προφίλ" />
          <CardContent className="grid gap-4">
            <NameForm endpoint="/api/me" label="Το όνομά σας" initial={user.name ?? ""} success="Το προφίλ ενημερώθηκε" />
            <DefinitionList items={[{ label: "Email", value: user.email }, { label: "Ρόλος", value: humanize(role) }]} />
          </CardContent>
        </Card>
        {isPlatformAdmin(user.email) && <PushNotifications description="Σας ειδοποιεί αμέσως για νέες αιτήσεις στη λίστα αναμονής και νέα σχόλια χρηστών. Ενεργοποιήστε το σε κάθε κινητό ή υπολογιστή που θέλετε." />}

        <Card id="security">
          <CardHeader title="Ασφάλεια" description="Αν χάσατε ένα κινητό ή συνδεθήκατε σε ξένο υπολογιστή, αποσυνδεθείτε παντού. Η αλλαγή κωδικού αποσυνδέει επίσης όλες τις συσκευές." />
          <CardContent className="grid gap-5">
            <ChangePassword />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-[13px] text-muted-foreground">Θα χρειαστεί να συνδεθείτε ξανά σε κάθε συσκευή.</p>
              <SignOutEverywhere />
            </div>
            <div className="grid gap-2 border-t border-border pt-4">
              <h3 className="text-sm font-semibold">Κωδικός 2 βημάτων</h3>
              <TwoStep enabled={twoStep.enabled} recoveryCodesLeft={twoStep.recoveryCodesLeft} />
            </div>
            <div className="grid gap-2 border-t border-border pt-4">
              <h3 className="text-sm font-semibold">Πρόσφατες συνδέσεις</h3>
              <p className="text-[13px] text-muted-foreground">Για σύνδεση από νέα συσκευή σάς στέλνουμε email και ειδοποίηση. Αν δείτε κάτι που δεν αναγνωρίζετε, αλλάξτε αμέσως τον κωδικό σας.</p>
              <ActivityList empty="Δεν υπάρχουν ακόμη καταγεγραμμένες συνδέσεις." items={logins.map((l) => ({ id: l.id, title: l.device ?? "Άγνωστη συσκευή", detail: l.ip ? `δίκτυο ${l.ip}` : null, at: l.at }))} />
            </div>
            {exports && (
              <div className="grid gap-2 border-t border-border pt-4">
                <h3 className="text-sm font-semibold">Λήψεις αρχείων με στοιχεία επισκεπτών</h3>
                <p className="text-[13px] text-muted-foreground">Ποιος από την ομάδα κατέβασε αρχεία (λογιστή, CSV, όλα τα δεδομένα) και πότε. Τα μέλη της ομάδας δεν βλέπουν ταυτότητες, τηλέφωνα και email επισκεπτών, ούτε κατεβάζουν αρχεία.</p>
                <ActivityList empty="Δεν έχει κατέβει κανένα αρχείο." items={exports.map((x) => ({ id: x.id, title: `${x.what}${x.year ? ` ${x.year}` : ""}`, detail: x.who, at: x.at }))} />
              </div>
            )}
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
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
              <a href="/terms" className="underline-offset-4 hover:underline">Όροι χρήσης</a>
              <a href="/dpa" className="underline-offset-4 hover:underline">Σύμβαση επεξεργασίας δεδομένων</a>
              <a href="/privacy" className="underline-offset-4 hover:underline">Πολιτική απορρήτου</a>
            </div>
            <DeleteAccount />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
