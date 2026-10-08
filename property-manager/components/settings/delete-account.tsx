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
        <Button variant="danger-outline">Διαγραφή λογαριασμού</Button>
      </DialogTrigger>
      <DialogContent
        title="Διαγραφή λογαριασμού;"
        description="Ο λογαριασμός σας διαγράφεται οριστικά. Οι οργανισμοί όπου είστε το μόνο μέλος διαγράφονται με όλα τους τα δεδομένα. Η ενέργεια δεν αναιρείται."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => api("/api/me", { method: "DELETE", body: { password } }), {
              success: "Ο λογαριασμός σας διαγράφηκε",
              refresh: false,
              onSuccess: () => void logoutAction(),
            });
          }}
        >
          <Field label="Επιβεβαίωση με τον κωδικό σας" htmlFor="delete-password" error={fieldErrors.password}>
            <Input id="delete-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="submit" variant="danger" loading={pending} disabled={!password}>Οριστική διαγραφή</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
