import { Bot, CalendarCheck2, FileCheck2, UserCheck, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BENEFITS } from "@/lib/marketing";
import { PRICE_PER_PROPERTY } from "@/lib/services/billing";
import { demoLoginAction } from "../actions";
import { WaitlistForm } from "./waitlist-form";

export const metadata: Metadata = {
  title: "Δοκιμάστε δωρεάν",
  description: "Η εφαρμογή για Έλληνες οικοδεσπότες βραχυχρόνιας μίσθωσης: κρατήσεις από όλες τις πλατφόρμες, ΑΑΔΕ, φόροι, check-in και βοηθός AI. Δωρεάν έως το τέλος του 2026.",
};

const FAQ: [string, string][] = [
  ["Βλέπετε τους κωδικούς μου στο Taxisnet;", "Όχι, ποτέ. Η εφαρμογή συμπληρώνει τη φόρμα της ΑΑΔΕ στη δική σας οθόνη· εσείς ελέγχετε και πατάτε την υποβολή. Κωδικούς δεν ζητάμε και δεν κρατάμε."],
  ["Πόσο θα κοστίζει μετά το 2026;", `${PRICE_PER_PROPERTY} € τον μήνα ανά κατάλυμα, μόνο για τους μήνες που έχει κρατήσεις: ένα εποχικό κατάλυμα δεν πληρώνει τον χειμώνα. Χωρίς δέσμευση, ακύρωση με ένα κλικ. Πριν από οποιαδήποτε χρέωση σας ενημερώνουμε με email.`],
  ["Κι αν δεν μου αρέσει;", "Σταματάτε όποτε θέλετε και κατεβάζετε όλα τα δεδομένα σας με ένα κουμπί."],
  ["Ποιος είναι πίσω από την εφαρμογή;", "Μια μικρή ομάδα οικοδεσποτών στην Ελλάδα. Τη φτιάξαμε για τα δικά μας καταλύματα και τη βελτιώνουμε με ό,τι μας λένε οι χρήστες."],
];

const ICONS = { calendar: CalendarCheck2, net: Wallet, aade: FileCheck2, checkin: UserCheck, ai: Bot } as const;

/** Where the visitor came from: utm_source, or an ad click (gclid / fbclid). */
function sourceOf(params: Record<string, string | string[] | undefined>) {
  const first = (k: string) => (Array.isArray(params[k]) ? params[k]![0] : params[k]) as string | undefined;
  return first("utm_source") ?? (first("gclid") ? "google-ads" : first("fbclid") ? "facebook" : null);
}

export default async function WaitlistPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const source = sourceOf(await searchParams);
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Η δήλωση στην ΑΑΔΕ γεμίζει μόνη της.</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">Και ξέρετε πόσα σας μένουν καθαρά από κάθε κράτηση Airbnb και Booking.</p>

      {/* 45-second tour of the real app: muted, loops, plays inline on phones. */}
      <video
        className="mx-auto mt-5 aspect-[9/16] w-full max-w-[260px] rounded-2xl bg-muted shadow-md"
        src="/media/tour.mp4"
        poster="/media/tour-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        controls
        preload="metadata"
        aria-label="Βίντεο 45 δευτερολέπτων: η εφαρμογή Βραχυχρόνια.ai στο κινητό"
      />

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

      <form action={demoLoginAction} className="mt-4 rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-medium">Θέλετε πρώτα να τη δείτε;</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Μπείτε σε δοκιμαστικό λογαριασμό με έτοιμες κρατήσεις, χωρίς email και χωρίς εγγραφή.</p>
        <Button type="submit" variant="outline" className="mt-3 w-full">Δοκιμάστε τώρα, χωρίς εγγραφή →</Button>
      </form>

      <h2 className="mt-8 text-lg font-semibold tracking-tight">Θέλω να το δοκιμάσω</h2>
      <p className="mt-1 text-sm text-muted-foreground">Θα σας στείλουμε email με τον σύνδεσμο εγγραφής.</p>
      <WaitlistForm source={source} />
      <h2 className="mt-10 text-lg font-semibold tracking-tight">Συχνές ερωτήσεις</h2>
      <div className="mt-2 divide-y divide-border rounded-xl border border-border bg-surface">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group px-4 py-3">
            <summary className="cursor-pointer list-none text-sm font-medium marker:hidden">
              <span className="mr-1 inline-block text-muted-foreground transition-transform group-open:rotate-90">›</span> {q}
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Έχετε ήδη λογαριασμό;{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Σύνδεση
        </Link>
      </p>
    </>
  );
}
