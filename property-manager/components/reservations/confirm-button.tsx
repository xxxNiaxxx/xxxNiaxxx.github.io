"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";

/** Confirms a pending reservation (e.g. a request from the booking page). */
export function ConfirmReservationButton({ id }: { id: string }) {
  const { run, pending } = useMutation();
  return (
    <Button loading={pending} onClick={() => run(() => api(`/api/reservations/${id}`, { method: "PATCH", body: { status: "CONFIRMED" } }), { success: "Η κράτηση επιβεβαιώθηκε" })}>
      <Check /> Επιβεβαίωση κράτησης
    </Button>
  );
}
