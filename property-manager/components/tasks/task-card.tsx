"use client";

import { Check, ChevronDown, CircleSlash, MoreHorizontal, Play, RotateCcw, UserRound } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PriorityBadge, StatusBadge } from "@/components/ui/status";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import { formatDateTime, humanize } from "@/lib/format";
import type { TaskDTO } from "@/lib/services/serializers";
import { cn } from "@/lib/utils";

export function TaskCard({ task, members }: { task: TaskDTO; members: { id: string; name: string }[] }) {
  const { run, pending } = useMutation();
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();
  const [checklist, setOptimisticChecklist] = useOptimistic(task.checklist);
  const update = (body: Record<string, unknown>, success: string) =>
    run(() => api(`/api/tasks/${task.id}`, { method: "PATCH", body }), { success });

  const toggleItem = (i: number) => {
    const next = checklist.map((c, j) => (j === i ? { ...c, done: !c.done } : c));
    startTransition(async () => {
      setOptimisticChecklist(next); // safe to show immediately; reverted by refresh if the save fails
      await run(() => api(`/api/tasks/${task.id}`, { method: "PATCH", body: { checklist: next } }));
    });
  };
  const done = checklist.filter((c) => c.done).length;
  const open = task.status === "TODO" || task.status === "IN_PROGRESS";

  return (
    <li className={cn("rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-card)]", !open && "opacity-75")}>
      <div className="flex items-start gap-3">
        <button
          aria-label={task.status === "COMPLETED" ? "Reopen task" : "Complete task"}
          disabled={pending || task.status === "CANCELLED"}
          onClick={() => update({ status: task.status === "COMPLETED" ? "TODO" : "COMPLETED" }, task.status === "COMPLETED" ? "Task reopened" : "Task completed")}
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
            task.status === "COMPLETED" ? "border-success bg-success text-white" : "border-border-strong hover:border-success hover:bg-success-soft",
          )}
        >
          {task.status === "COMPLETED" && <Check className="size-3" strokeWidth={3} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("font-medium", task.status === "COMPLETED" && "line-through decoration-subtle-foreground")}>{task.title}</span>
            <PriorityBadge value={task.priority} />
            {task.status !== "TODO" && <StatusBadge value={task.status} />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{humanize(task.type)}</span>
            <Link href={`/properties/${task.propertyId}`} className="hover:text-foreground">{task.propertyName}</Link>
            {task.dueAt && <span className={cn(task.overdue && "font-medium text-danger")}>{task.overdue ? "Overdue · " : ""}{formatDateTime(task.dueAt)}</span>}
            {task.reservationId && <Link href={`/reservations/${task.reservationId}`} className="hover:text-foreground">Reservation →</Link>}
            <span className="flex items-center gap-1"><UserRound className="size-3" />{task.assigneeName ?? "Unassigned"}</span>
          </div>
          {task.description && <p className="mt-2 text-[13px] text-muted-foreground">{task.description}</p>}
          {checklist.length > 0 && (
            <button onClick={() => setExpanded((x) => !x)} className="mt-2 flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-accent transition-all" style={{ width: `${(done / checklist.length) * 100}%` }} />
              </span>
              Checklist {done}/{checklist.length}
              <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
            </button>
          )}
          {expanded && (
            <ul className="mt-2 grid gap-1">
              {checklist.map((item, i) => (
                <li key={i}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-[13px] hover:bg-muted/60">
                    <input type="checkbox" checked={item.done} onChange={() => toggleItem(i)} disabled={!open} className="size-4 accent-[var(--color-accent)]" />
                    <span className={cn(item.done && "text-muted-foreground line-through")}>{item.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {task.status === "TODO" && (
            <Button size="xs" variant="outline" onClick={() => update({ status: "IN_PROGRESS" }, "Task started")} disabled={pending} className="hidden sm:inline-flex">
              <Play /> Start
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label="Task actions"><MoreHorizontal /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {task.status === "TODO" && <DropdownMenuItem onSelect={() => update({ status: "IN_PROGRESS" }, "Task started")}><Play /> Start</DropdownMenuItem>}
              {open && <DropdownMenuItem onSelect={() => update({ status: "COMPLETED" }, "Task completed")}><Check /> Complete</DropdownMenuItem>}
              {open && <DropdownMenuItem onSelect={() => update({ status: "CANCELLED" }, "Task cancelled")}><CircleSlash /> Cancel</DropdownMenuItem>}
              {!open && <DropdownMenuItem onSelect={() => update({ status: "TODO" }, "Task reopened")}><RotateCcw /> Reopen</DropdownMenuItem>}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Assign to</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => update({ assignedToUserId: null }, "Task unassigned")}>Unassigned</DropdownMenuItem>
              {members.map((m) => (
                <DropdownMenuItem key={m.id} onSelect={() => update({ assignedToUserId: m.id }, `Assigned to ${m.name}`)}>
                  {m.id === task.assignedToUserId ? <Check /> : <span className="size-4" />} {m.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  );
}
