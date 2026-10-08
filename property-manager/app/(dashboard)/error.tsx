"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-center">
      <div className="rounded-xl bg-danger-soft p-3 text-danger">
        <AlertTriangle className="size-5" />
      </div>
      <h1 className="text-lg font-semibold">Κάτι πήγε στραβά</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Η σελίδα δεν φόρτωσε. Δοκιμάστε ξανά· αν επιμένει, ελέγξτε ότι η βάση δεδομένων λειτουργεί.
      </p>
      {error.digest && <p className="font-mono text-xs text-subtle-foreground">Κωδικός: {error.digest}</p>}
      <Button onClick={reset} variant="outline">
        Δοκιμάστε ξανά
      </Button>
    </div>
  );
}
