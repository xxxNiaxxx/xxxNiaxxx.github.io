"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { api, formValues } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import type { PropertyDTO } from "@/lib/services/serializers";

export function PropertyFormDialog({ property, trigger }: { property?: PropertyDTO; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { run, pending, fieldErrors: err } = useMutation();
  const editing = Boolean(property);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    await run(
      () =>
        api(editing ? `/api/properties/${property!.id}` : "/api/properties", {
          method: editing ? "PATCH" : "POST",
          body: v,
        }),
      { success: editing ? "Property updated" : "Property created", onSuccess: () => setOpen(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={editing ? "Edit property" : "New property"} description="Basic details used across reservations, tasks and reports." wide>
        <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-6">
          <Field label="Name" htmlFor="name" error={err.name} className="sm:col-span-4">
            <Input id="name" name="name" required defaultValue={property?.name} aria-invalid={!!err.name} placeholder="Villa Elia" />
          </Field>
          <Field label="Status" htmlFor="status" className="sm:col-span-2">
            <Select id="status" name="status" defaultValue={property?.status ?? "ACTIVE"}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </Field>
          <Field label="Address" htmlFor="address" error={err.address} className="sm:col-span-6">
            <Input id="address" name="address" defaultValue={property?.address ?? ""} />
          </Field>
          <Field label="City / area" htmlFor="city" error={err.city} className="sm:col-span-3">
            <Input id="city" name="city" required defaultValue={property?.city} aria-invalid={!!err.city} placeholder="Chania, Crete" />
          </Field>
          <Field label="Country" htmlFor="country" error={err.country} className="sm:col-span-3">
            <Input id="country" name="country" required defaultValue={property?.country ?? "Greece"} aria-invalid={!!err.country} />
          </Field>
          <Field label="Bedrooms" htmlFor="bedrooms" error={err.bedrooms} className="sm:col-span-2">
            <Input id="bedrooms" name="bedrooms" type="number" min={0} defaultValue={property?.bedrooms ?? 1} />
          </Field>
          <Field label="Bathrooms" htmlFor="bathrooms" error={err.bathrooms} className="sm:col-span-2">
            <Input id="bathrooms" name="bathrooms" type="number" min={0} defaultValue={property?.bathrooms ?? 1} />
          </Field>
          <Field label="Max guests" htmlFor="maxGuests" error={err.maxGuests} className="sm:col-span-2">
            <Input id="maxGuests" name="maxGuests" type="number" min={1} defaultValue={property?.maxGuests ?? 2} />
          </Field>
          <Field label="Base price / night" htmlFor="basePrice" error={err.basePrice} className="sm:col-span-4">
            <Input id="basePrice" name="basePrice" type="number" min={0} step="0.01" required defaultValue={property?.basePrice ?? ""} aria-invalid={!!err.basePrice} />
          </Field>
          <Field label="Currency" htmlFor="currency" error={err.currency} className="sm:col-span-2">
            <Input id="currency" name="currency" maxLength={3} defaultValue={property?.currency ?? "EUR"} />
          </Field>
          <Field label="Description" htmlFor="description" error={err.description} className="sm:col-span-6">
            <Textarea id="description" name="description" defaultValue={property?.description ?? ""} />
          </Field>
          <DialogFooter className="sm:col-span-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {editing ? "Save changes" : "Create property"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
