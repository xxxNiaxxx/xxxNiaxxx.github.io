"use client";

import { Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";

export function PropertyStatusToggle({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) {
  const { run, pending } = useMutation();
  const deactivate = status === "ACTIVE";
  return (
    <Button
      variant={deactivate ? "danger-outline" : "outline"}
      loading={pending}
      onClick={() => {
        if (deactivate && !confirm("Απενεργοποίηση ακινήτου; Δεν θα δέχεται νέες κρατήσεις. Οι υπάρχουσες διαμονές παραμένουν.")) return;
        run(() => api(`/api/properties/${id}`, { method: "PATCH", body: { status: deactivate ? "INACTIVE" : "ACTIVE" } }), {
          success: deactivate ? "Το ακίνητο απενεργοποιήθηκε" : "Το ακίνητο ενεργοποιήθηκε",
        });
      }}
    >
      <Power /> {deactivate ? "Απενεργοποίηση" : "Ενεργοποίηση"}
    </Button>
  );
}
