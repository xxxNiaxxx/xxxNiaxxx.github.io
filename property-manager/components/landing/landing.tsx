import {
  Bot, CalendarCheck2, CalendarX2, Check, ClipboardList, FileSpreadsheet, Globe, Landmark, Minus, Smartphone, UserCheck, BellRing,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/layout/logo";
import { APP_NAME, FREE_UNTIL_NOTE } from "@/lib/brand";

const FEATURES = [
  { icon: CalendarCheck2, title: "Όλες οι κρατήσεις μαζί", text: "Booking, Airbnb, Vrbo και άλλες πλατφόρμες στο ίδιο ημερολόγιο — με iCal και εισαγωγή του αρχείου κρατήσεων." },
  { icon: CalendarX2, title: "Ειδοποίηση διπλοκράτησης", text: "Αν δύο πλατφόρμες κλείσουν τις ίδιες μέρες, το μαθαίνετε αμέσως, με email." },
  { icon: Landmark, title: "ΑΑΔΕ χωρίς άγχος", text: "Η δήλωση κάθε διαμονής έτοιμη για αντιγραφή, προθεσμίες, ΤΑΚΚ ανά μήνα, ΦΠΑ και τέλος 0,5% για επιχειρήσεις." },
  { icon: UserCheck, title: "Online check-in", text: "Ο επισκέπτης δίνει μόνος του ΑΦΜ ή διαβατήριο, ώρα άφιξης και αποδέχεται τους κανόνες — στη γλώσσα του." },
  { icon: Bot, title: "Βοηθός AI", text: "Γράφει απαντήσεις στους επισκέπτες στη γλώσσα τους, από όσα του μάθατε για το σπίτι, και απαντά για τα δεδομένα σας." },
  { icon: Globe, title: "Απευθείας κρατήσεις", text: "Δική σας σελίδα κρατήσεων και οδηγός επισκέπτη — χωρίς προμήθεια πλατφόρμας." },
  { icon: BellRing, title: "Υπενθυμίσεις", text: "Ένα email το πρωί, μόνο όταν κάτι λήγει. Και ο μήνας σας με μια ματιά στην αρχή κάθε μήνα." },
  { icon: FileSpreadsheet, title: "Φάκελος για τον λογιστή", text: "Όλη η χρονιά ανά ΑΜΑ σε PDF και Excel: έσοδα, ΤΑΚΚ, διαμονές, έξοδα." },
  { icon: ClipboardList, title: "Καθαρισμοί και ομάδα", text: "Εργασίες ανά κατάλυμα, ανάθεση στο συνεργείο, ρόλοι για κάθε μέλος της ομάδας." },
  { icon: Smartphone, title: "Και στο κινητό", text: "Εφαρμογή Android με όλα τα παραπάνω, για να τα έχετε μαζί σας." },
];

const COMPARE: [string, string, string][] = [
  ["Δηλώσεις ΑΑΔΕ, ΤΑΚΚ, ΦΠΑ και 0,5%", "yes", "Συχνά σε ακριβότερο πακέτο"],
  ["Φόρος και καθαρό ποσό σε κάθε κράτηση", "yes", "no"],
  ["Ελληνικά, φτιαγμένο για την Ελλάδα", "yes", "Μερικώς"],
  ["Βοηθός AI για απαντήσεις σε επισκέπτες", "yes", "Συχνά σε ακριβότερο πακέτο"],
  ["Online check-in και οδηγός επισκέπτη", "yes", "Συχνά επιπλέον χρέωση"],
  ["Σελίδα απευθείας κρατήσεων", "yes", "Εφάπαξ κόστος εκατοντάδων €"],
  ["Αλλαγή τιμών από ένα σημείο σε όλες τις πλατφόρμες", "Σε επόμενη φάση", "yes"],
  ["Τιμή", "Δωρεάν έως το τέλος του 2026", "~20–30 € ανά κατάλυμα τον μήνα"],
];

const FAQ = [
  ["Χρειάζεται να δώσω κωδικούς από Booking, Airbnb ή TAXISnet;", "Όχι. Οι κρατήσεις έρχονται με τον σύνδεσμο ημερολογίου (iCal) κάθε πλατφόρμας και με το αρχείο κρατήσεων που κατεβάζετε. Τη δήλωση στην ΑΑΔΕ την υποβάλλετε εσείς, με τα στοιχεία έτοιμα."],
  ["Είναι σωστοί οι φόροι;", "Η εφαρμογή ακολουθεί τους ισχύοντες κανόνες (Ε2, κλίμακες, ΤΑΚΚ, ΦΠΑ 13%, 0,5%) και δείχνει πώς υπολογίζει κάθε ποσό. Είναι εκτίμηση για να ξέρετε τι σας μένει — την τελική εικόνα τη δίνει η δήλωση και ο λογιστής σας."],
  ["Τι γίνεται μετά το 2026;", "Θα σας ενημερώσουμε για τα πακέτα πολύ πριν από οποιαδήποτε χρέωση. Τίποτα δεν χρεώνεται αυτόματα και τα δεδομένα σας μένουν δικά σας."],
  ["Έχω πολλά καταλύματα. Δουλεύει;", "Ναι — κάθε κατάλυμα με το δικό του ΑΜΑ, ημερολόγια, ΤΑΚΚ και δηλώσεις, και τα οικονομικά όλων μαζί ή χωριστά."],
  ["Πού είναι τα δεδομένα μου;", "Σε cloud servers με κρυπτογραφημένη σύνδεση. Κάθε ομάδα βλέπει μόνο τα δικά της δεδομένα και μπορείτε να διαγράψετε τον λογαριασμό σας οποιαδήποτε στιγμή."],
];

function Cell({ v }: { v: string }) {
  if (v === "yes") return <Check className="mx-auto size-5 text-success" aria-label="Ναι" />;
  if (v === "no") return <Minus className="mx-auto size-5 text-muted-foreground" aria-label="Όχι" />;
  return <span>{v}</span>;
}

export function Landing() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 font-semibold tracking-tight">
          <Logo /> <span className="truncate">{APP_NAME}</span>
        </Link>
        <nav className="flex shrink-0 items-center gap-1 text-sm sm:gap-3">
          <Link href="/help" className="hidden px-2 py-1.5 text-muted-foreground hover:text-foreground sm:inline">Πώς λειτουργεί</Link>
          <Link href="/login" className="px-2 py-1.5 text-muted-foreground hover:text-foreground">Σύνδεση</Link>
          <Link href="/waitlist" className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground">Δοκιμή</Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-4 pt-6 pb-14 text-center sm:px-6 sm:pt-10">
          <Image src="/logo-full.png" alt={APP_NAME} width={631} height={695} priority className="mx-auto mb-6 h-40 w-auto sm:h-52" />
          <p className="mx-auto inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">{FREE_UNTIL_NOTE}</p>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            Οι βραχυχρόνιες μισθώσεις σας, οργανωμένες — και πάντα εντάξει με την ΑΑΔΕ.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Κρατήσεις από όλες τις πλατφόρμες, δηλώσεις διαμονής, ΤΑΚΚ, φόροι και καθαρό ποσό ανά κράτηση, online check-in και
            βοηθός AI. Στα ελληνικά, για Έλληνες οικοδεσπότες.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/waitlist" className="rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground">Θέλω να το δοκιμάσω</Link>
            <Link href="/help" className="rounded-xl border border-border bg-surface px-5 py-3 font-medium">Δείτε πώς λειτουργεί</Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6" aria-labelledby="features">
          <h2 id="features" className="sr-only">Τι κάνει</h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="rounded-2xl border border-border bg-surface p-5">
                <f.icon className="size-6 text-accent" />
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-muted/50 py-16" aria-labelledby="example">
          <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <h2 id="example" className="text-2xl font-semibold tracking-tight">Ξέρετε τι σας μένει από κάθε κράτηση</h2>
              <p className="mt-3 text-muted-foreground">
                Η εφαρμογή διαβάζει τα νούμερα όπως τα δίνει το Booking — τιμή δωματίου, τέλος 0,5%, ΤΑΚΚ, προμήθεια — και
                υπολογίζει φόρο και καθαρό ποσό. Το ίδιο για κάθε πλατφόρμα και για απευθείας κρατήσεις.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-5 text-sm shadow-[var(--shadow-card)]">
              <div className="mb-3 text-xs text-muted-foreground">Παράδειγμα · Booking.com · 5 νύχτες · ιδιώτης</div>
              {[
                ["Τιμή δωματίου", "210,03 €"],
                ["ΤΑΚΚ (αποδίδεται στην ΑΑΔΕ)", "40,00 €"],
                ["Πληρωμή επισκέπτη", "250,03 €"],
                ["Προμήθεια Booking 15%", "− 31,37 €"],
                ["Χρέωση πληρωμών Booking", "− 4,00 €"],
                ["Φόρος εισοδήματος (εκτίμηση)", "− 29,93 €"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border py-2"><span className="text-muted-foreground">{k}</span><span className="tabular-nums">{v}</span></div>
              ))}
              <div className="flex justify-between pt-2 font-semibold"><span>Καθαρά για εσάς</span><span className="tabular-nums">144,73 €</span></div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6" aria-labelledby="compare">
          <h2 id="compare" className="text-2xl font-semibold tracking-tight">Σε σύγκριση με τα συνηθισμένα προγράμματα διαχείρισης</h2>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium" />
                  <th className="px-4 py-3 text-center font-semibold">{APP_NAME}</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Συνηθισμένο channel manager</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {COMPARE.map(([k, a, b]) => (
                  <tr key={k}>
                    <td className="px-4 py-3">{k}</td>
                    <td className="px-4 py-3 text-center font-medium"><Cell v={a} /></td>
                    <td className="px-4 py-3 text-center text-muted-foreground"><Cell v={b} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6" aria-labelledby="faq">
          <h2 id="faq" className="text-2xl font-semibold tracking-tight">Συχνές ερωτήσεις</h2>
          <div className="mt-6 grid gap-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-xl border border-border bg-surface p-4">
                <summary className="cursor-pointer list-none font-medium">{q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 pb-20 text-center sm:px-6">
          <div className="rounded-3xl bg-primary px-6 py-12 text-primary-foreground">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ξεκινήστε δωρεάν</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/75">{FREE_UNTIL_NOTE} Ανοίγουμε σταδιακά — γραφτείτε και θα σας στείλουμε τον σύνδεσμο εγγραφής.</p>
            <Link href="/waitlist" className="mt-6 inline-block rounded-xl bg-white px-5 py-3 font-medium text-primary">Μπείτε στη λίστα αναμονής</Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <span>© {new Date().getFullYear()} {APP_NAME}</span>
          <nav className="flex gap-4">
            <Link href="/help" className="hover:text-foreground">Βοήθεια</Link>
            <Link href="/privacy" className="hover:text-foreground">Απόρρητο</Link>
            <Link href="/terms" className="hover:text-foreground">Όροι χρήσης</Link>
            <Link href="/dpa" className="hover:text-foreground">GDPR</Link>
            <Link href="/login" className="hover:text-foreground">Σύνδεση</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
