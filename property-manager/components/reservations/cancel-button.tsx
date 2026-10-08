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
        if (!confirm("Cancel this reservation? The dates become available again and open tasks for it are cancelled.")) return;
        run(() => api(`/api/reservations/${id}/cancel`, { method: "POST" }), { success: "Reservation cancelled" });
      }}
    >
      <Ban /> Cancel reservation
    </Button>
  );
}
