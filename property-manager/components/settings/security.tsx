"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";

/** After a change that ends every session, clear this browser's cookie and go to sign-in. */
const toSignIn = () => window.location.assign("/logout");

export function ChangePassword() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const { run, pending, fieldErrors } = useMutation();
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => api("/api/me/password", { body: { currentPassword, newPassword } }), {
          success: "Ο κωδικός άλλαξε. Συνδεθείτε με τον νέο κωδικό.",
          refresh: false,
          onSuccess: toSignIn,
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Τωρινός κωδικός" htmlFor="current-password" error={fieldErrors.currentPassword}>
          <PasswordInput id="current-password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="Νέος κωδικός" htmlFor="new-password" error={fieldErrors.newPassword} hint="Τουλάχιστον 8 χαρακτήρες">
          <PasswordInput id="new-password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(e) => setNew(e.target.value)} />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="outline" loading={pending} disabled={!currentPassword || newPassword.length < 8}>Αλλαγή κωδικού</Button>
      </div>
    </form>
  );
}

export function SignOutEverywhere() {
  const { run, pending } = useMutation();
  return (
    <Button
      variant="outline"
      loading={pending}
      onClick={() =>
        confirm("Να γίνει αποσύνδεση από όλους τους υπολογιστές και τα κινητά, και από αυτή τη συσκευή;") &&
        run(() => api("/api/me/sign-out-everywhere", { method: "POST" }), { refresh: false, onSuccess: toSignIn })
      }
    >
      Αποσύνδεση από όλες τις συσκευές
    </Button>
  );
}
