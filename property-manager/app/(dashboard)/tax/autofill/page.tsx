import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { BookmarkletLink } from "./bookmarklet-link";

export const metadata: Metadata = { title: "Αυτόματη συμπλήρωση ΑΑΔΕ" };

export default async function AutofillPage() {
  await getPageContext();
  return (
    <div className="grid max-w-2xl grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader
        back={{ href: "/tax", label: "Φορολογικά" }}
        title="Αυτόματη συμπλήρωση ΑΑΔΕ"
        description="Ένα κουμπί στον browser του υπολογιστή που γεμίζει τη φόρμα της δήλωσης βραχυχρόνιας διαμονής με τα στοιχεία της κράτησης."
      />

      <Card className="grid gap-4 p-5 text-sm">
        <h2 className="text-base font-semibold">Μία φορά: προσθέστε το κουμπί</h2>
        <ol className="grid list-decimal gap-2 pl-5">
          <li>Ανοίξτε τη σελίδα αυτή σε Chrome, Edge ή Firefox στον <strong>υπολογιστή</strong>.</li>
          <li>Εμφανίστε τη γραμμή σελιδοδεικτών: <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd> (σε Mac <kbd>⌘</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd>).</li>
          <li>
            <strong>Σύρετε</strong> το παρακάτω κουμπί με το ποντίκι και αφήστε το πάνω στη γραμμή σελιδοδεικτών:
            <div className="mt-3"><BookmarkletLink /></div>
          </li>
        </ol>
        <p className="text-xs text-muted-foreground">
          Αν δεν σύρεται: πατήστε «Αντιγραφή κώδικα», φτιάξτε νέο σελιδοδείκτη με όνομα «Συμπλήρωση ΑΑΔΕ» και επικολλήστε τον κώδικα στη
          διεύθυνση (URL).
        </p>
      </Card>

      <Card className="grid gap-4 p-5 text-sm">
        <h2 className="text-base font-semibold">Σε κάθε δήλωση</h2>
        <ol className="grid list-decimal gap-2 pl-5">
          <li>Στην κράτηση, στην κάρτα «Δήλωση στο Μητρώο ΑΑΔΕ», πατήστε <strong>«Αυτόματη συμπλήρωση»</strong>.</li>
          <li>Μπείτε στο Μητρώο της ΑΑΔΕ με τους κωδικούς σας, επιλέξτε το ακίνητο και <strong>«Υποβολή Νέας Δήλωσης»</strong>.</li>
          <li>Πατήστε το κουμπί <strong>«Συμπλήρωση ΑΑΔΕ»</strong> στη γραμμή σελιδοδεικτών. Αν ο browser ρωτήσει για το πρόχειρο, πατήστε «Να επιτρέπεται».</li>
          <li><strong>Ελέγξτε</strong> τα πεδία και κάντε εσείς την υποβολή. Μετά πατήστε «Το υπέβαλα» στην κράτηση.</li>
        </ol>
      </Card>

      <Card className="grid gap-2 p-5 text-sm">
        <h2 className="text-base font-semibold">Ασφάλεια</h2>
        <p className="text-muted-foreground">
          Το κουμπί δουλεύει μόνο μέσα στον δικό σας browser: διαβάζει τα στοιχεία που αντιγράψατε και τα γράφει στη φόρμα. Δεν στέλνει
          τίποτα πουθενά, δεν πατά ποτέ υποβολή και δεν βλέπει τους κωδικούς σας TAXISnet. Αν η ΑΑΔΕ αλλάξει τη φόρμα και κάποιο πεδίο
          δεν συμπληρωθεί, θα σας το πει και θα το συμπληρώσετε με το χέρι.
        </p>
      </Card>
    </div>
  );
}
