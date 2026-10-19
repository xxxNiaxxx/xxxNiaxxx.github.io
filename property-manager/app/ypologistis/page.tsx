import type { Metadata } from "next";
import Link from "next/link";
import { NetCalculator } from "@/components/landing/net-calculator";
import { Logo } from "@/components/layout/logo";
import { PublicFooter } from "@/components/layout/public-footer";
import { APP_NAME } from "@/lib/brand";
import { todayISO } from "@/lib/dates";
import { LAST_REVIEWED } from "@/lib/tax/gr";

export const metadata: Metadata = {
  title: "Υπολογιστής καθαρών για Airbnb και Booking",
  description: "Πόσα σας μένουν πραγματικά από τη βραχυχρόνια μίσθωση: προμήθειες Airbnb και Booking, ΤΑΚΚ, φόρος εισοδήματος Ε2. Δωρεάν, χωρίς εγγραφή.",
};

/** Public, no sign-up: a quick yearly estimate that leads to the real numbers in the app. */
export default function CalculatorPage() {
  const year = Number(todayISO().slice(0, 4));
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 font-semibold tracking-tight">
          <Logo /> <span className="truncate">{APP_NAME}</span>
        </Link>
        <Link href="/waitlist?utm_source=calculator" className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Δοκιμή</Link>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-3xl py-6 text-center sm:py-10">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Πόσα σας μένουν πραγματικά από το Airbnb και το Booking;</h1>
          <p className="mt-3 text-muted-foreground">
            Προμήθειες, έξοδα και φόρος εισοδήματος για το {year}, σε 30 δευτερόλεπτα. Δωρεάν, χωρίς εγγραφή· τίποτα δεν αποθηκεύεται.
          </p>
        </div>
        <NetCalculator year={year} />
        <p className="mx-auto mt-8 max-w-3xl text-center text-xs text-muted-foreground">
          Εκτίμηση για ιδιώτη με ένα ακίνητο (ως 2 ακίνητα με ΑΜΑ· από 3 και πάνω ισχύει το καθεστώς επιχείρησης με ΦΠΑ). Κλίμακα ενοικίων {year},
          ΤΑΚΚ και προμήθειες όπως ίσχυαν στις {LAST_REVIEWED.split("-").reverse().join("/")}. Δεν είναι φορολογική συμβουλή· επιβεβαιώστε με τον λογιστή σας.
          {" "}<Link href="/help#foros" className="underline underline-offset-4">Πώς υπολογίζεται ο φόρος</Link>
        </p>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <PublicFooter />
        </div>
      </footer>
    </div>
  );
}
