import { Logo } from "@/components/layout/logo";
import { APP_NAME } from "@/lib/brand";

/** Public pages for guests (online check-in, guide, direct booking): no app chrome. */
export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">{children}</main>
      <footer className="flex items-center justify-center gap-1.5 pb-8 text-xs text-muted-foreground">
        <Logo className="size-4" /> {APP_NAME}
      </footer>
    </div>
  );
}
