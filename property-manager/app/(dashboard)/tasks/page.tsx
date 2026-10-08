import { ClipboardList, Plus } from "lucide-react";
import type { Metadata } from "next";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskFormDialog } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterSelect } from "@/components/ui/filters";
import { EmptyState, LinkTabs, PageHeader } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { TASK_TYPES } from "@/lib/constants";
import { humanize } from "@/lib/format";
import { getFormOptions } from "@/lib/services/options";
import { listTasks } from "@/lib/services/tasks";
import { taskListQuery, taskTab } from "@/lib/validation/task";

export const metadata: Metadata = { title: "Εργασίες" };

const TABS = [
  { key: "today", label: "Σήμερα" },
  { key: "upcoming", label: "Επόμενες" },
  { key: "overdue", label: "Καθυστερούν" },
  { key: "completed", label: "Ολοκληρωμένες" },
] as const;

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { ctx } = await getPageContext();
  const sp = await searchParams;
  const tab = taskTab.safeParse(sp.tab).success ? (sp.tab as (typeof TABS)[number]["key"]) : "today";
  const parsed = taskListQuery.safeParse({ tab, propertyId: sp.filterProperty, type: sp.type, status: sp.status, assignee: sp.assignee });
  const filters = parsed.success ? parsed.data : { tab };
  const [tasks, counts, options] = await Promise.all([
    listTasks(ctx, filters),
    Promise.all(TABS.map((t) => listTasks(ctx, { ...filters, tab: t.key }).then((r) => r.length))),
    getFormOptions(ctx),
  ]);
  const qs = (key: string) => {
    const q = new URLSearchParams(Object.entries(sp).filter(([k]) => !["tab", "new"].includes(k)));
    q.set("tab", key);
    return `/tasks?${q}`;
  };

  return (
    <>
      <PageHeader
        title="Εργασίες"
        description="Καθαρισμοί, συντήρηση και ό,τι άλλο χρειάζεται"
        actions={
          <TaskFormDialog
            properties={options.properties.filter((p) => p.status === "ACTIVE")}
            members={options.members}
            defaults={{ propertyId: sp.propertyId, reservationId: sp.reservationId }}
            defaultOpen={sp.new === "1"}
            trigger={<Button><Plus /> Νέα εργασία</Button>}
          />
        }
      />
      <div className="mb-4">
        <LinkTabs active={tab} tabs={TABS.map((t, i) => ({ key: t.key, label: t.label, href: qs(t.key), count: counts[i] }))} />
      </div>
      <div className="mb-5 grid grid-cols-2 gap-2 sm:flex">
        <FilterSelect param="filterProperty" label="Όλα τα ακίνητα" options={options.properties.map((p) => ({ value: p.id, label: p.name }))} />
        <FilterSelect param="type" label="Όλοι οι τύποι" options={TASK_TYPES.map((t) => ({ value: t, label: humanize(t) }))} />
        {tab !== "completed" && tab !== "overdue" && (
          <FilterSelect param="status" label="Ανοιχτές" options={["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => ({ value: s, label: humanize(s) }))} />
        )}
        <FilterSelect param="assignee" label="Όλοι" options={[{ value: "me", label: "Σε εμένα" }, { value: "unassigned", label: "Χωρίς ανάθεση" }, ...options.members.map((m) => ({ value: m.id, label: m.name }))]} />
      </div>
      {tasks.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList />}
            title={tab === "overdue" ? "Τίποτα δεν καθυστερεί" : tab === "today" ? "Καμία εργασία για σήμερα" : "Δεν υπάρχουν εργασίες"}
            description={tab === "overdue" ? "Μπράβο — όλες οι εργασίες είναι στην ώρα τους." : "Δημιουργήστε εργασία ή αλλάξτε τα φίλτρα."}
          />
        </Card>
      ) : (
        <ul className="grid gap-3">
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} members={options.members} />
          ))}
        </ul>
      )}
    </>
  );
}
