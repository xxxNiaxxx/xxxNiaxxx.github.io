"use client";

import { useState } from "react";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";

export function DeleteAccount() {
  const [password, setPassword] = useState("");
  const { run, pending, fieldErrors } = useMutation();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="danger-outline">Delete account</Button>
      </DialogTrigger>
      <DialogContent
        title="Delete your account?"
        description="This permanently deletes your account. Organizations where you are the only member are deleted with all their data. This cannot be undone."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => api("/api/me", { method: "DELETE", body: { password } }), {
              success: "Your account has been deleted",
              refresh: false,
              onSuccess: () => void logoutAction(),
            });
          }}
        >
          <Field label="Confirm with your password" htmlFor="delete-password" error={fieldErrors.password}>
            <Input id="delete-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="submit" variant="danger" loading={pending} disabled={!password}>Delete permanently</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
