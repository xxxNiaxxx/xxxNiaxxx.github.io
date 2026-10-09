import type { Metadata } from "next";
import Link from "next/link";
import { isRegistrationOpen } from "@/lib/services/waitlist";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Σύνδεση" };

/** The demo credentials are shown in development, or online only when SHOW_DEMO_LOGIN=1. */
const showDemoLogin = process.env.NODE_ENV !== "production" || process.env.SHOW_DEMO_LOGIN === "1";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const open = await isRegistrationOpen();
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Καλώς ήρθατε</h1>
      <p className="mt-1 text-sm text-muted-foreground">Συνδεθείτε για να διαχειριστείτε τα ακίνητά σας.</p>
      <LoginForm next={next} />
      <p className="mt-6 text-sm text-muted-foreground">
        Πρώτη φορά εδώ;{" "}
        <Link href={open ? "/register" : "/waitlist"} className="font-medium text-foreground underline-offset-4 hover:underline">
          {open ? "Δημιουργία λογαριασμού" : "Θέλω να δοκιμάσω την εφαρμογή"}
        </Link>
      </p>
      {showDemoLogin && (
        <div className="mt-8 rounded-xl border border-dashed border-border-strong bg-surface p-4 text-[13px] text-muted-foreground">
          <p className="font-medium text-foreground">Δοκιμαστικός λογαριασμός</p>
          <p className="mt-1">Δοκιμάστε την εφαρμογή με έτοιμα δεδομένα. Επαναφέρονται κάθε βράδυ.</p>
          <p className="mt-1">
            demo@demo-hospitality.test · <span className="font-mono">{process.env.DEMO_PASSWORD || "demo1234"}</span>
          </p>
        </div>
      )}
    </>
  );
}
