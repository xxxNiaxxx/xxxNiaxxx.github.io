import Link from "next/link";
import { PriorityBadge, StatusBadge } from "@/components/ui/status";
import { formatDateTime, humanize } from "@/lib/format";
import type { TaskDTO } from "@/lib/services/serializers";
import { cn } from "@/lib/utils";

export function TaskListCompact({ tasks, showProperty = true }: { tasks: TaskDTO[]; showProperty?: boolean }) {
  return (
    <ul className="divide-y divide-border">
      {tasks.map((t) => (
        <li key={t.id}>
          <Link href={`/tasks?tab=all&propertyId=${t.propertyId}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{t.title}</div>
              <div className={cn("truncate text-xs", t.overdue ? "text-danger" : "text-muted-foreground")}>
                {humanize(t.type)}
                {showProperty && t.propertyName ? ` · ${t.propertyName}` : ""}
                {t.dueAt ? ` · ${t.overdue ? "καθυστερεί από " : "έως "}${formatDateTime(t.dueAt)}` : ""}
              </div>
            </div>
            <PriorityBadge value={t.priority} />
            <StatusBadge value={t.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
