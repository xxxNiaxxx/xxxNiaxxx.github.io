"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { api, formValues } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import type { GuestDTO } from "@/lib/services/serializers";

/** Reusable guest fields; `prefix` namespaces names when nested in another form. */
export function GuestFields({ guest, err, prefix = "" }: { guest?: GuestDTO; err: Record<string, string>; prefix?: string }) {
  const e = (k: string) => err[`${prefix}${k}`];
  const n = (k: string) => (prefix ? `${prefix}${k}` : k);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="First name" htmlFor={n("firstName")} error={e("firstName")}>
        <Input id={n("firstName")} name={n("firstName")} required defaultValue={guest?.firstName} aria-invalid={!!e("firstName")} />
      </Field>
      <Field label="Last name" htmlFor={n("lastName")} error={e("lastName")}>
        <Input id={n("lastName")} name={n("lastName")} required defaultValue={guest?.lastName} aria-invalid={!!e("lastName")} />
      </Field>
      <Field label="Email" htmlFor={n("email")} error={e("email")}>
        <Input id={n("email")} name={n("email")} type="email" defaultValue={guest?.email ?? ""} aria-invalid={!!e("email")} />
      </Field>
      <Field label="Phone" htmlFor={n("phone")} error={e("phone")}>
        <Input id={n("phone")} name={n("phone")} type="tel" defaultValue={guest?.phone ?? ""} aria-invalid={!!e("phone")} />
      </Field>
      <Field label="Country" htmlFor={n("country")} error={e("country")} className="sm:col-span-2">
        <Input id={n("country")} name={n("country")} defaultValue={guest?.country ?? ""} placeholder="e.g. GR, DE, United Kingdom" />
      </Field>
    </div>
  );
}

export function GuestFormDialog({ guest, trigger }: { guest?: GuestDTO; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { run, pending, fieldErrors } = useMutation();
  const editing = Boolean(guest);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={editing ? "Edit guest" : "New guest"}>
        <form
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            const body = formValues(e.currentTarget);
            await run(() => api(editing ? `/api/guests/${guest!.id}` : "/api/guests", { method: editing ? "PATCH" : "POST", body }), {
              success: editing ? "Guest updated" : "Guest added",
              onSuccess: () => setOpen(false),
            });
          }}
        >
          <GuestFields guest={guest} err={fieldErrors} />
          <Field label="Notes" htmlFor="notes" className="mt-4">
            <Textarea id="notes" name="notes" defaultValue={guest?.notes ?? ""} placeholder="Preferences, allergies, special occasions…" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={pending}>{editing ? "Save changes" : "Add guest"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
