"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { api, formValues } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import { PRIORITIES, TASK_TITLE_PRESETS, TASK_TYPES } from "@/lib/constants";
import { zonedDateTime } from "@/lib/dates";
import { humanize } from "@/lib/format";

const CUSTOM = "__custom";
type TaskType = (typeof TASK_TYPES)[number];

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
  const [preset, setPreset] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [type, setType] = useState<TaskType>("CLEANING");
  const title = preset === CUSTOM ? customTitle : preset;

  function choosePreset(value: string) {
    setPreset(value);
    // Picking a common title also sets its type.
    const match = TASK_TYPES.find((t) => TASK_TITLE_PRESETS[t].includes(value));
    if (match) setType(match);
  }

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
      <DialogContent title="Νέα εργασία" description="Οι καθαρισμοί παίρνουν αυτόματα τη βασική λίστα ελέγχου.">
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
              success: "Η εργασία δημιουργήθηκε",
              onSuccess: () => {
                onOpenChange(false);
                setPreset("");
                setCustomTitle("");
              },
            });
          }}
        >
          <Field label="Τίτλος" htmlFor="titlePreset" error={err.title} className="sm:col-span-2">
            <Select id="titlePreset" value={preset} onChange={(e) => choosePreset(e.target.value)} aria-invalid={!!err.title}>
              <option value="" disabled>Επιλέξτε εργασία…</option>
              {TASK_TYPES.map((t) => (
                <optgroup key={t} label={humanize(t)}>
                  {TASK_TITLE_PRESETS[t].map((p) => <option key={p} value={p}>{p}</option>)}
                </optgroup>
              ))}
              <option value={CUSTOM}>Άλλος τίτλος…</option>
            </Select>
            {preset === CUSTOM && (
              <Input id="title" className="mt-2" autoFocus required placeholder="Γράψτε τον τίτλο της εργασίας" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} aria-label="Τίτλος εργασίας" aria-invalid={!!err.title} />
            )}
            <input type="hidden" name="title" value={title} />
          </Field>
          <Field label="Ακίνητο" htmlFor="propertyId" error={err.propertyId}>
            <Select id="propertyId" name="propertyId" defaultValue={defaults?.propertyId ?? properties[0]?.id}>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Τύπος" htmlFor="type">
            <Select id="type" name="type" value={type} onChange={(e) => setType(e.target.value as TaskType)}>
              {TASK_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
            </Select>
          </Field>
          <Field label="Προθεσμία" htmlFor="dueDate">
            <Input id="dueDate" name="dueDate" type="date" />
          </Field>
          <Field label="Ώρα" htmlFor="dueTime">
            <Input id="dueTime" name="dueTime" type="time" defaultValue="11:00" />
          </Field>
          <Field label="Προτεραιότητα" htmlFor="priority">
            <Select id="priority" name="priority" defaultValue="MEDIUM">
              {PRIORITIES.map((p) => <option key={p} value={p}>{humanize(p)}</option>)}
            </Select>
          </Field>
          <Field label="Ανάθεση σε" htmlFor="assignedToUserId">
            <Select id="assignedToUserId" name="assignedToUserId" defaultValue="">
              <option value="">Χωρίς ανάθεση</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
          <Field label="Περιγραφή" htmlFor="description" className="sm:col-span-2">
            <Textarea id="description" name="description" />
          </Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Ακύρωση</Button>
            <Button type="submit" loading={pending}>Δημιουργία εργασίας</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
