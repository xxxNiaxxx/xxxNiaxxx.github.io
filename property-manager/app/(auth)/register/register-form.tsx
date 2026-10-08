"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { registerAction, type AuthFormState } from "../actions";

export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(registerAction, {});
  const err = state.fieldErrors ?? {};
  return (
    <form action={action} className="mt-8 grid gap-4">
      <Field label="Your name" htmlFor="name" error={err.name}>
        <Input id="name" name="name" autoComplete="name" required defaultValue={state.values?.name} aria-invalid={!!err.name} />
      </Field>
      <Field label="Email" htmlFor="email" error={err.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} aria-invalid={!!err.email} />
      </Field>
      <Field label="Password" htmlFor="password" error={err.password} hint="At least 8 characters">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-invalid={!!err.password} />
      </Field>
      <Field label="Organization name" htmlFor="organizationName" error={err.organizationName} hint="e.g. Aegean Stays">
        <Input id="organizationName" name="organizationName" required defaultValue={state.values?.organizationName} aria-invalid={!!err.organizationName} />
      </Field>
      {state.error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" loading={pending} className="mt-1">
        Create account
      </Button>
    </form>
  );
}
