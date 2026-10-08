import { Logo } from "@/components/layout/logo";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col justify-between p-6 sm:p-10">
        <div className="flex items-center gap-2.5 font-semibold tracking-tight">
          <Logo /> {APP_NAME}
        </div>
        <div className="mx-auto w-full max-w-sm py-10">{children}</div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} {APP_NAME}</p>
      </div>
      <div className="relative hidden overflow-hidden bg-primary lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(45,212,191,0.25),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.08),transparent_40%)]" />
        <div className="relative flex h-full flex-col justify-end p-12 text-primary-foreground">
          <p className="text-sm text-white/60">Observe → Decide → Act</p>
          <p className="mt-3 max-w-md text-3xl leading-tight font-semibold tracking-tight">{APP_TAGLINE}</p>
          <ul className="mt-8 space-y-3 text-sm text-white/75">
            <li>• See what needs your attention today, at a glance</li>
            <li>• Reservations, calendar, cleaning and maintenance in one place</li>
            <li>• An AI manager that answers from your real data — and asks before acting</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
