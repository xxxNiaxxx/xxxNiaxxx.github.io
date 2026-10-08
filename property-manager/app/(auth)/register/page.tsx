import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Δημιουργία λογαριασμού" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Δημιουργήστε λογαριασμό</h1>
      <p className="mt-1 text-sm text-muted-foreground">Ρυθμίστε τον οργανισμό σας σε λιγότερο από ένα λεπτό.</p>
      <RegisterForm />
      <p className="mt-6 text-sm text-muted-foreground">
        Έχετε ήδη λογαριασμό;{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Σύνδεση
        </Link>
      </p>
    </>
  );
}
