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
      { success: editing ? "Το ακίνητο ενημερώθηκε" : "Το ακίνητο δημιουργήθηκε", onSuccess: () => setOpen(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={editing ? "Επεξεργασία ακινήτου" : "Νέο ακίνητο"} description="Βασικά στοιχεία που χρησιμοποιούνται σε κρατήσεις, εργασίες και αναφορές." wide>
        <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-6">
          <Field label="Όνομα" htmlFor="name" error={err.name} className="sm:col-span-4">
            <Input id="name" name="name" required defaultValue={property?.name} aria-invalid={!!err.name} placeholder="Villa Elia" />
          </Field>
          <Field label="Κατάσταση" htmlFor="status" className="sm:col-span-2">
            <Select id="status" name="status" defaultValue={property?.status ?? "ACTIVE"}>
              <option value="ACTIVE">Ενεργό</option>
              <option value="INACTIVE">Ανενεργό</option>
            </Select>
          </Field>
          <Field label="Διεύθυνση" htmlFor="address" error={err.address} className="sm:col-span-6">
            <Input id="address" name="address" defaultValue={property?.address ?? ""} />
          </Field>
          <Field label="Πόλη / περιοχή" htmlFor="city" error={err.city} className="sm:col-span-3">
            <Input id="city" name="city" required defaultValue={property?.city} aria-invalid={!!err.city} placeholder="Χανιά, Κρήτη" />
          </Field>
          <Field label="Χώρα" htmlFor="country" error={err.country} className="sm:col-span-3">
            <Input id="country" name="country" required defaultValue={property?.country ?? "Ελλάδα"} aria-invalid={!!err.country} />
          </Field>
          <Field label="Υπνοδωμάτια" htmlFor="bedrooms" error={err.bedrooms} className="sm:col-span-2">
            <Input id="bedrooms" name="bedrooms" type="number" min={0} defaultValue={property?.bedrooms ?? 1} />
          </Field>
          <Field label="Μπάνια" htmlFor="bathrooms" error={err.bathrooms} className="sm:col-span-2">
            <Input id="bathrooms" name="bathrooms" type="number" min={0} defaultValue={property?.bathrooms ?? 1} />
          </Field>
          <Field label="Μέγιστα άτομα" htmlFor="maxGuests" error={err.maxGuests} className="sm:col-span-2">
            <Input id="maxGuests" name="maxGuests" type="number" min={1} defaultValue={property?.maxGuests ?? 2} />
          </Field>
          <Field label="Βασική τιμή / νύχτα" htmlFor="basePrice" error={err.basePrice} className="sm:col-span-4">
            <Input id="basePrice" name="basePrice" type="number" min={0} step="0.01" required defaultValue={property?.basePrice ?? ""} aria-invalid={!!err.basePrice} />
          </Field>
          <Field label="Νόμισμα" htmlFor="currency" error={err.currency} className="sm:col-span-2">
            <Input id="currency" name="currency" maxLength={3} defaultValue={property?.currency ?? "EUR"} />
          </Field>
          <Field label="ΑΜΑ" htmlFor="ama" error={err.ama} hint="Αριθμός Μητρώου Ακινήτου (ΑΑΔΕ)" className="sm:col-span-2">
            <Input id="ama" name="ama" inputMode="numeric" defaultValue={property?.ama ?? ""} aria-invalid={!!err.ama} placeholder="00000000000" />
          </Field>
          <Field label="Τύπος" htmlFor="kind" hint="Επηρεάζει το ΤΑΚΚ" className="sm:col-span-2">
            <Select id="kind" name="kind" defaultValue={property?.kind ?? "APARTMENT"}>
              <option value="APARTMENT">Διαμέρισμα / δωμάτιο</option>
              <option value="DETACHED_HOUSE">Μονοκατοικία</option>
            </Select>
          </Field>
          <Field label="Εμβαδόν (m²)" htmlFor="areaSqm" error={err.areaSqm} className="sm:col-span-2">
            <Input id="areaSqm" name="areaSqm" type="number" min={5} defaultValue={property?.areaSqm ?? ""} />
          </Field>
          <Field label="Περιγραφή" htmlFor="description" error={err.description} className="sm:col-span-6">
            <Textarea id="description" name="description" defaultValue={property?.description ?? ""} />
          </Field>
          <DialogFooter className="sm:col-span-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Ακύρωση
            </Button>
            <Button type="submit" loading={pending}>
              {editing ? "Αποθήκευση" : "Δημιουργία ακινήτου"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
