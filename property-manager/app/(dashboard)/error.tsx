"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-center">
      <div className="rounded-xl bg-danger-soft p-3 text-danger">
        <AlertTriangle className="size-5" />
      </div>
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        We couldn&apos;t load this page. Try again — if it keeps happening, check that the database is running.
      </p>
      {error.digest && <p className="font-mono text-xs text-subtle-foreground">Ref: {error.digest}</p>}
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  );
}
