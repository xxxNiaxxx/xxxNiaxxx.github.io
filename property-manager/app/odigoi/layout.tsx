import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { PublicFooter } from "@/components/layout/public-footer";
import { APP_NAME } from "@/lib/brand";

/** Public guides: readable without signing in, for people who search on Google. */
export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 font-semibold tracking-tight">
          <Logo /> <span className="truncate">{APP_NAME}</span>
        </Link>
        <Link href="/waitlist?utm_source=guides" className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Δοκιμή</Link>
      </header>
      <main className="mx-auto max-w-2xl px-5 pb-16 pt-4">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto max-w-3xl px-5 py-6">
          <PublicFooter />
        </div>
      </footer>
    </div>
  );
}
