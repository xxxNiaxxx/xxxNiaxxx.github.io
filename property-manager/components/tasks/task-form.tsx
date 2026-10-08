"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { api, formValues } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import { PRIORITIES, TASK_TYPES } from "@/lib/constants";
import { zonedDateTime } from "@/lib/dates";
import { humanize } from "@/lib/format";


export function TaskFormDialog({
  properties,
  members,
  defaults,
  defaultOpen,
  trigger,
}: {
  properties: { id: string; name: string }[];
  members: { id: string; name: string }[];
  defaults?: { propertyId?: string; reservationId?: string };
  defaultOpen?: boolean;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const { run, pending, fieldErrors: err } = useMutation();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next && params.get("new")) {
      const q = new URLSearchParams(params.toString());
      ["new", "propertyId", "reservationId"].forEach((k) => q.delete(k));
      router.replace(q.size ? `${pathname}?${q}` : pathname, { scroll: false });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title="New task" description="Cleaning tasks get a standard turnover checklist automatically.">
        <form
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const v = formValues(e.currentTarget);
            const dueAt = v.dueDate ? zonedDateTime(v.dueDate, v.dueTime || "10:00").toISOString() : null;
            const { dueDate: _d, dueTime: _t, ...rest } = v;
            void _d;
            void _t;
            await run(() => api("/api/tasks", { body: { ...rest, dueAt, reservationId: defaults?.reservationId ?? null } }), {
              success: "Task created",
              onSuccess: () => onOpenChange(false),
            });
          }}
        >
          <Field label="Title" htmlFor="title" error={err.title} className="sm:col-span-2">
            <Input id="title" name="title" required placeholder="Turnover cleaning" aria-invalid={!!err.title} />
          </Field>
          <Field label="Property" htmlFor="propertyId" error={err.propertyId}>
            <Select id="propertyId" name="propertyId" defaultValue={defaults?.propertyId ?? properties[0]?.id}>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Type" htmlFor="type">
            <Select id="type" name="type" defaultValue="CLEANING">
              {TASK_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
            </Select>
          </Field>
          <Field label="Due date" htmlFor="dueDate">
            <Input id="dueDate" name="dueDate" type="date" />
          </Field>
          <Field label="Time" htmlFor="dueTime">
            <Input id="dueTime" name="dueTime" type="time" defaultValue="11:00" />
          </Field>
          <Field label="Priority" htmlFor="priority">
            <Select id="priority" name="priority" defaultValue="MEDIUM">
              {PRIORITIES.map((p) => <option key={p} value={p}>{humanize(p)}</option>)}
            </Select>
          </Field>
          <Field label="Assign to" htmlFor="assignedToUserId">
            <Select id="assignedToUserId" name="assignedToUserId" defaultValue="">
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
          <Field label="Description" htmlFor="description" className="sm:col-span-2">
            <Textarea id="description" name="description" />
          </Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={pending}>Create task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
