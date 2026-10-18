"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { loginAction, type AuthFormState } from "../actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(loginAction, {});
  // Controlled, so the password stays in the browser (not echoed by the server) while the code is asked.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const askCode = !!state.needsCode;
  return (
    <form action={action} className="mt-8 grid gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} readOnly={askCode} />
      </Field>
      <Field label="Κωδικός" htmlFor="password">
        <PasswordInput id="password" name="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} readOnly={askCode} />
      </Field>
      {askCode && (
        <Field label="Κωδικός 2 βημάτων" htmlFor="code" hint="Οι 6 αριθμοί από την εφαρμογή επαλήθευσης (π.χ. Google Authenticator), ή ένας κωδικός ανάκτησης.">
          <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" autoFocus required maxLength={20} />
        </Field>
      )}
      {state.error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" loading={pending} className="mt-1">
        {askCode ? "Επιβεβαίωση" : "Σύνδεση"}
      </Button>
    </form>
  );
}
