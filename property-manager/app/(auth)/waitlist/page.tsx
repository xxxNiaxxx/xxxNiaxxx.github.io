import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME, FREE_UNTIL_NOTE } from "@/lib/brand";
import { WaitlistForm } from "./waitlist-form";

export const metadata: Metadata = { title: "Λίστα αναμονής" };

export default function WaitlistPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Θέλω να δοκιμάσω το {APP_NAME}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ανοίγουμε την εφαρμογή σταδιακά. Αφήστε τα στοιχεία σας και θα σας στείλουμε email με τον προσωπικό σας σύνδεσμο εγγραφής.
      </p>
      <p className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-sm font-medium text-accent">{FREE_UNTIL_NOTE}</p>
      <p className="mt-3 text-sm text-muted-foreground">
        <Link href="/help" className="font-medium text-foreground underline-offset-4 hover:underline">Δείτε πώς λειτουργεί</Link>: ποσά, προμήθειες, φόροι, πολλά καταλύματα.
      </p>
      <WaitlistForm />
      <p className="mt-6 text-sm text-muted-foreground">
        Έχετε ήδη λογαριασμό;{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Σύνδεση
        </Link>
      </p>
    </>
  );
}
