import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">We couldn&apos;t find that</h1>
      <p className="max-w-sm text-sm text-muted-foreground">It may have been removed, or it belongs to another organization.</p>
      <Button asChild variant="outline" className="mt-2">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
