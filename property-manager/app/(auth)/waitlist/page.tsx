import { Bot, CalendarCheck2, Landmark, UserCheck, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BENEFITS } from "@/lib/marketing";
import { WaitlistForm } from "./waitlist-form";

export const metadata: Metadata = {
  title: "Δοκιμάστε δωρεάν",
  description: "Η εφαρμογή για Έλληνες οικοδεσπότες βραχυχρόνιας μίσθωσης: κρατήσεις από όλες τις πλατφόρμες, ΑΑΔΕ, φόροι, check-in και βοηθός AI. Δωρεάν έως το τέλος του 2026.",
};

const ICONS = { calendar: CalendarCheck2, net: Wallet, aade: Landmark, checkin: UserCheck, ai: Bot } as const;

/** Where the visitor came from: utm_source, or an ad click (gclid / fbclid). */
function sourceOf(params: Record<string, string | string[] | undefined>) {
  const first = (k: string) => (Array.isArray(params[k]) ? params[k]![0] : params[k]) as string | undefined;
  return first("utm_source") ?? (first("gclid") ? "google-ads" : first("fbclid") ? "facebook" : null);
}

export default async function WaitlistPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const source = sourceOf(await searchParams);
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Έχετε Airbnb ή Booking; Αυτή η εφαρμογή σας γλιτώνει χρόνο.</h1>

      <ul className="mt-5 grid gap-3" aria-label="Τι κάνει για εσάς">
        {BENEFITS.map((b) => {
          const Icon = ICONS[b.key];
          return (
            <li key={b.key} className="flex items-center gap-3 text-[15px]">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Icon className="size-4" />
              </span>
              <span className="font-medium">{b.title}</span>
            </li>
          );
        })}
      </ul>

      <p className="mt-5 rounded-lg bg-accent-soft px-3 py-2 text-sm font-medium text-accent">Δωρεάν μέχρι το τέλος του 2026. Χωρίς κάρτα.</p>

      <h2 className="mt-8 text-lg font-semibold tracking-tight">Θέλω να το δοκιμάσω</h2>
      <p className="mt-1 text-sm text-muted-foreground">Θα σας στείλουμε email με τον σύνδεσμο εγγραφής.</p>
      <WaitlistForm source={source} />
      <p className="mt-6 text-sm text-muted-foreground">
        Έχετε ήδη λογαριασμό;{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Σύνδεση
        </Link>
      </p>
    </>
  );
}
