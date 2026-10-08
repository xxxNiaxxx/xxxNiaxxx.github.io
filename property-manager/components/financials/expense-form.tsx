"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { api, formValues } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";
import { humanize } from "@/lib/format";

const CATEGORIES = ["CLEANING", "MAINTENANCE", "UTILITIES", "SUPPLIES", "PLATFORM_FEE", "OTHER", "BOOKING"] as const;

export function TransactionFormDialog({ properties, today }: { properties: { id: string; name: string }[]; today: string }) {
  const [open, setOpen] = useState(false);
  const { run, pending, fieldErrors: err } = useMutation();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus /> Νέα κίνηση</Button>
      </DialogTrigger>
      <DialogContent title="Νέα κίνηση" description="Καταχωρίστε έξοδο ή άλλο έσοδο. Τα έσοδα κρατήσεων προστίθενται αυτόματα.">
        <form
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const body = formValues(e.currentTarget);
            await run(() => api("/api/transactions", { body }), { success: "Η κίνηση καταχωρήθηκε", onSuccess: () => setOpen(false) });
          }}
        >
          <Field label="Τύπος" htmlFor="type">
            <Select id="type" name="type" defaultValue="EXPENSE">
              <option value="EXPENSE">Έξοδο</option>
              <option value="INCOME">Έσοδο</option>
            </Select>
          </Field>
          <Field label="Κατηγορία" htmlFor="category">
            <Select id="category" name="category" defaultValue="CLEANING">
              {CATEGORIES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}
            </Select>
          </Field>
          <Field label="Ακίνητο" htmlFor="propertyId" error={err.propertyId}>
            <Select id="propertyId" name="propertyId">
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Ημερομηνία" htmlFor="transactionDate" error={err.transactionDate}>
            <Input id="transactionDate" name="transactionDate" type="date" defaultValue={today} />
          </Field>
          <Field label="Ποσό (€)" htmlFor="amount" error={err.amount}>
            <Input id="amount" name="amount" type="number" min={0} step="0.01" required aria-invalid={!!err.amount} />
          </Field>
          <Field label="Περιγραφή" htmlFor="description">
            <Input id="description" name="description" placeholder="π.χ. Επίσκεψη υδραυλικού" />
          </Field>
          <input type="hidden" name="currency" value="EUR" />
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Ακύρωση</Button>
            <Button type="submit" loading={pending}>Καταχώριση</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
