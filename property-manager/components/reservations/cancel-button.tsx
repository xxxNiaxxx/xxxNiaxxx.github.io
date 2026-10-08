"use client";

import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";

export function CancelReservationButton({ id }: { id: string }) {
  const { run, pending } = useMutation();
  return (
    <Button
      variant="danger-outline"
      loading={pending}
      onClick={() => {
        if (!confirm("Ακύρωση κράτησης; Οι ημερομηνίες ελευθερώνονται και οι ανοιχτές εργασίες της ακυρώνονται.")) return;
        run(() => api(`/api/reservations/${id}/cancel`, { method: "POST" }), { success: "Η κράτηση ακυρώθηκε" });
      }}
    >
      <Ban /> Ακύρωση κράτησης
    </Button>
  );
}
