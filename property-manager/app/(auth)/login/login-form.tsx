"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { loginAction, type AuthFormState } from "../actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(loginAction, {});
  return (
    <form action={action} className="mt-8 grid gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} />
      </Field>
      <Field label="Κωδικός" htmlFor="password">
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
      </Field>
      {state.error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" loading={pending} className="mt-1">
        Σύνδεση
      </Button>
    </form>
  );
}
