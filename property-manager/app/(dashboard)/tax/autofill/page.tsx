import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { AUTOFILL_VERSION } from "@/lib/aade-autofill";
import { getPageContext } from "@/lib/auth/page";
import { BookmarkletLink, CopyCodeButton } from "./bookmarklet-link";

export const metadata: Metadata = { title: "Αυτόματη συμπλήρωση ΑΑΔΕ" };

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">{n}</span>
      <div className="min-w-0 pt-0.5">{children}</div>
    </li>
  );
}

export default async function AutofillPage() {
  await getPageContext();
  return (
    <div className="grid max-w-2xl grid-cols-[minmax(0,1fr)] gap-6">
      <PageHeader
        back={{ href: "/tax", label: "Φορολογικά" }}
        title="Αυτόματη συμπλήρωση ΑΑΔΕ"
        description="Ένα κουμπί «Συμπλήρωση ΑΑΔΕ» στους σελιδοδείκτες σας, που γεμίζει μόνο του τη φόρμα της δήλωσης. Το βάζετε μία φορά."
      />

      {/* Phone first on small screens, computer first on large ones. */}
      <Card className="order-1 grid gap-4 p-5 text-sm md:order-2">
        <h2 className="text-base font-semibold">📱 Στο κινητό (Chrome) · μία φορά</h2>
        <ol className="grid gap-4">
          <Step n={1}>
            Πατήστε αυτό το κουμπί:
            <div className="mt-2"><CopyCodeButton /></div>
          </Step>
          <Step n={2}>
            Πατήστε τις <strong>3 τελείες ⋮</strong> πάνω δεξιά στο Chrome και μετά το <strong>αστεράκι ☆</strong>. Κάτω εμφανίζεται
            «Προστέθηκε σελιδοδείκτης»: πατήστε <strong>«Επεξεργασία»</strong>.
          </Step>
          <Step n={3}>
            Στο <strong>Όνομα</strong> σβήστε ό,τι γράφει και γράψτε: <strong>Συμπλήρωση ΑΑΔΕ</strong>
          </Step>
          <Step n={4}>
            Στη <strong>Διεύθυνση (URL)</strong> σβήστε ό,τι γράφει, πατήστε παρατεταμένα και διαλέξτε <strong>«Επικόλληση»</strong>. Πατήστε
            το βελάκι ← πάνω αριστερά για αποθήκευση.
          </Step>
        </ol>

        <h2 className="mt-2 text-base font-semibold">📱 Σε κάθε δήλωση</h2>
        <ol className="grid gap-4">
          <Step n={1}>Στην κράτηση πατήστε <strong>«Αυτόματη συμπλήρωση»</strong>.</Step>
          <Step n={2}>Ανοίξτε τη φόρμα της ΑΑΔΕ: Μητρώο → το ακίνητο → <strong>«Υποβολή Νέας Δήλωσης»</strong>.</Step>
          <Step n={3}>
            Πατήστε πάνω στη <strong>γραμμή διευθύνσεων</strong> (εκεί που γράφει www1.gsis.gr), γράψτε <strong>Συμπλήρωση</strong> και από τις
            προτάσεις πατήστε το «Συμπλήρωση ΑΑΔΕ» με το αστεράκι ☆.
          </Step>
          <Step n={4}>
            Αν σας ρωτήσει για το πρόχειρο, πατήστε <strong>«Να επιτρέπεται»</strong>. Αν σας ζητήσει να επικολλήσετε, πατήστε παρατεταμένα →
            «Επικόλληση» → OK.
          </Step>
          <Step n={5}>Η φόρμα γεμίζει. <strong>Ελέγξτε</strong> και πατήστε εσείς την υποβολή.</Step>
        </ol>
        <p className="text-xs text-muted-foreground">
          Στο κινητό ο σελιδοδείκτης δουλεύει μόνο αν τον διαλέξετε από τη γραμμή διευθύνσεων, όχι από τη λίστα σελιδοδεικτών. Σε iPhone
          (Safari) τον πατάτε κανονικά από τους σελιδοδείκτες.
        </p>
      </Card>

      <Card className="order-2 grid gap-4 p-5 text-sm md:order-1">
        <h2 className="text-base font-semibold">💻 Στον υπολογιστή · μία φορά</h2>
        <ol className="grid gap-4">
          <Step n={1}>Ανοίξτε αυτή τη σελίδα σε Chrome, Edge ή Firefox.</Step>
          <Step n={2}>Πατήστε <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd> (σε Mac <kbd>⌘</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd>) για να φανεί η γραμμή σελιδοδεικτών.</Step>
          <Step n={3}>
            <strong>Σύρετε</strong> αυτό το κουμπί με το ποντίκι πάνω στη γραμμή σελιδοδεικτών:
            <div className="mt-2"><BookmarkletLink /></div>
          </Step>
        </ol>
        <h2 className="mt-2 text-base font-semibold">💻 Σε κάθε δήλωση</h2>
        <ol className="grid gap-4">
          <Step n={1}>Στην κράτηση πατήστε <strong>«Αυτόματη συμπλήρωση»</strong>.</Step>
          <Step n={2}>Ανοίξτε τη φόρμα της ΑΑΔΕ και πατήστε <strong>«Συμπλήρωση ΑΑΔΕ»</strong> στη γραμμή σελιδοδεικτών.</Step>
          <Step n={3}>Ελέγξτε τα πεδία και πατήστε εσείς την υποβολή.</Step>
        </ol>
      </Card>

      <Card className="order-3 grid gap-2 p-5 text-sm">
        <h2 className="text-base font-semibold">Έκδοση</h2>
        <p className="text-muted-foreground">
          Τρέχουσα έκδοση: <strong className="text-foreground">{AUTOFILL_VERSION}</strong>. Το μήνυμα στο τέλος της συμπλήρωσης γράφει ποια
          έκδοση έτρεξε. Ο σελιδοδείκτης παίρνει μόνος του την τελευταία έκδοση· αν το μήνυμα γράφει παλαιότερη, ανανεώστε τη σελίδα της ΑΑΔΕ
          και ξαναδοκιμάστε, κι αν επιμένει, ξαναβάλτε τον σελιδοδείκτη (βήματα «μία φορά» παραπάνω).
        </p>
      </Card>

      <Card className="order-4 grid gap-2 p-5 text-sm">
        <h2 className="text-base font-semibold">Ασφάλεια</h2>
        <p className="text-muted-foreground">
          Το κουμπί δουλεύει μόνο μέσα στον δικό σας browser: γράφει στη φόρμα τα στοιχεία που αντιγράψατε. Δεν στέλνει τίποτα πουθενά, δεν
          πατά ποτέ υποβολή και δεν βλέπει τους κωδικούς σας. Αν κάποιο πεδίο δεν συμπληρωθεί, θα σας το πει.
        </p>
      </Card>
    </div>
  );
}
