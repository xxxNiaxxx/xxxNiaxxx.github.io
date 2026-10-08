"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";

export function NameForm({ endpoint, label, initial, disabled, success }: { endpoint: string; label: string; initial: string; disabled?: boolean; success: string }) {
  const [name, setName] = useState(initial);
  const { run, pending, fieldErrors } = useMutation();
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => api(endpoint, { method: "PATCH", body: { name } }), { success });
      }}
    >
      <Field label={label} htmlFor={endpoint} error={fieldErrors.name} className="flex-1">
        <Input id={endpoint} value={name} onChange={(e) => setName(e.target.value)} disabled={disabled} />
      </Field>
      <Button type="submit" variant="outline" loading={pending} disabled={disabled || name.trim() === initial || !name.trim()}>Save</Button>
    </form>
  );
}
