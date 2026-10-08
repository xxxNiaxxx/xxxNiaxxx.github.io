"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { registerAction, type AuthFormState } from "../actions";

export function RegisterForm({ invite }: { invite?: { token: string; email: string } }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(registerAction, {});
  const err = state.fieldErrors ?? {};
  return (
    <form action={action} className="mt-8 grid gap-4">
      {invite && <input type="hidden" name="invite" value={invite.token} />}
      <Field label="Ονοματεπώνυμο" htmlFor="name" error={err.name}>
        <Input id="name" name="name" autoComplete="name" required defaultValue={state.values?.name} aria-invalid={!!err.name} />
      </Field>
      <Field label="Email" htmlFor="email" error={err.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={invite?.email ?? state.values?.email} readOnly={!!invite} aria-invalid={!!err.email} />
      </Field>
      <Field label="Κωδικός" htmlFor="password" error={err.password} hint="Τουλάχιστον 8 χαρακτήρες">
        <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} aria-invalid={!!err.password} />
      </Field>
      {!invite && (
        <Field label="Όνομα επιχείρησης / οργανισμού" htmlFor="organizationName" error={err.organizationName} hint="π.χ. Aegean Stays">
          <Input id="organizationName" name="organizationName" required defaultValue={state.values?.organizationName} aria-invalid={!!err.organizationName} />
        </Field>
      )}
      {state.error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" loading={pending} className="mt-1">
        {invite ? "Δημιουργία λογαριασμού και είσοδος στην ομάδα" : "Δημιουργία λογαριασμού"}
      </Button>
    </form>
  );
}
