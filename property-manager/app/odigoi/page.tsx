import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "./guides";

export const metadata: Metadata = {
  title: "Οδηγοί για τη βραχυχρόνια μίσθωση",
  description: "Δήλωση στην ΑΑΔΕ, ΤΑΚΚ, φόρος, ΦΠΑ και καθαρά από Airbnb και Booking: σύντομοι οδηγοί για οικοδεσπότες στην Ελλάδα.",
  alternates: { canonical: "/odigoi" },
};

export default function GuidesPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Οδηγοί για τη βραχυχρόνια μίσθωση</h1>
      <p className="mt-2 text-muted-foreground">Σύντομα και με νούμερα: ό,τι ρωτούν πιο συχνά οι οικοδεσπότες Airbnb και Booking στην Ελλάδα.</p>
      <ul className="mt-6 grid gap-3">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/odigoi/${g.slug}`} className="block rounded-xl border border-border bg-surface p-4 hover:border-primary/40">
              <span className="font-medium">{g.title}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{g.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
