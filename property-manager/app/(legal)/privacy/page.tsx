import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME, SUPPORT_EMAIL } from "@/lib/brand";

export const metadata: Metadata = { title: "Πολιτική απορρήτου · Privacy policy" };

const LAST_UPDATED = "2026-10-08";

function Contact() {
  return SUPPORT_EMAIL ? <a className="text-accent underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> : <span>τα στοιχεία επικοινωνίας στη σελίδα της εφαρμογής στο Google Play</span>;
}

export default function PrivacyPage() {
  return (
    <>
      <h1>Πολιτική απορρήτου</h1>
      <p>Τελευταία ενημέρωση: {LAST_UPDATED}</p>
      <p>
        Το {APP_NAME} είναι εργαλείο διαχείρισης βραχυχρόνιων μισθώσεων για επαγγελματίες (ιδιοκτήτες και διαχειριστές
        καταλυμάτων). Η πολιτική αυτή εξηγεί ποια δεδομένα επεξεργαζόμαστε, γιατί και ποια δικαιώματα έχετε.
      </p>

      <h2>Ποια δεδομένα συλλέγουμε</h2>
      <ul>
        <li><strong>Λογαριασμός:</strong> όνομα, email και κωδικός (αποθηκεύεται μόνο κρυπτογραφημένος με bcrypt).</li>
        <li><strong>Δεδομένα επιχείρησης που καταχωρείτε:</strong> ακίνητα, κρατήσεις, εργασίες, έσοδα/έξοδα.</li>
        <li><strong>Στοιχεία επισκεπτών που καταχωρείτε:</strong> όνομα, email, τηλέφωνο, χώρα, σημειώσεις και μηνύματα. Για αυτά τα δεδομένα εσείς είστε ο υπεύθυνος επεξεργασίας και εμείς ενεργούμε ως εκτελών την επεξεργασία.</li>
        <li><strong>Συνομιλίες με τον βοηθό AI</strong> και οι ενέργειες που προτείνει/εγκρίνετε.</li>
      </ul>
      <p>Δεν συλλέγουμε τοποθεσία, επαφές, φωτογραφίες, διαφημιστικά αναγνωριστικά ή δεδομένα πληρωμών. Δεν χρησιμοποιούμε διαφημίσεις ούτε εργαλεία παρακολούθησης.</p>

      <h2>Πώς τα χρησιμοποιούμε</h2>
      <ul>
        <li>Για να λειτουργεί η υπηρεσία (σύνδεση, εμφάνιση και αποθήκευση των δεδομένων σας).</li>
        <li>Για τις απαντήσεις του βοηθού AI: όταν κάνετε ερώτηση, τα σχετικά δεδομένα του οργανισμού σας μπορεί να αποσταλούν στον πάροχο τεχνητής νοημοσύνης που έχει ρυθμιστεί, μόνο για να παραχθεί η απάντηση.</li>
      </ul>
      <p>Δεν πουλάμε και δεν μοιραζόμαστε δεδομένα με τρίτους για διαφημιστικούς σκοπούς.</p>

      <h2>Πού αποθηκεύονται</h2>
      <p>
        Σε διακομιστές και βάση δεδομένων παρόχων φιλοξενίας (cloud). Όλη η επικοινωνία γίνεται κρυπτογραφημένα (HTTPS). Κάθε
        οργανισμός βλέπει μόνο τα δικά του δεδομένα.
      </p>

      <h2>Διατήρηση και διαγραφή</h2>
      <p>
        Τα δεδομένα διατηρούνται όσο υπάρχει ο λογαριασμός σας. Μπορείτε να διαγράψετε τον λογαριασμό σας οποιαδήποτε στιγμή
        από την εφαρμογή — δείτε <Link className="text-accent underline" href="/account-deletion">Διαγραφή λογαριασμού</Link>.
      </p>

      <h2>Τα δικαιώματά σας (GDPR)</h2>
      <p>Έχετε δικαίωμα πρόσβασης, διόρθωσης, διαγραφής, περιορισμού, φορητότητας και εναντίωσης, καθώς και δικαίωμα καταγγελίας στην Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (www.dpa.gr).</p>

      <h2>Επικοινωνία</h2>
      <p>Για οποιοδήποτε θέμα απορρήτου: <Contact />.</p>

      <h2>Privacy policy (English summary)</h2>
      <p>
        {APP_NAME} stores your account (name, email, bcrypt-hashed password) and the business data you enter (properties,
        reservations, guests, tasks, finances, AI chats). Guest data is processed on your behalf. When you ask the AI
        assistant a question, relevant data from your organization may be sent to the configured AI provider solely to
        generate the answer. No ads, no tracking, no sale of data. Data is kept until you delete your account, which you can
        do in the app at any time (<Link className="text-accent underline" href="/account-deletion">account deletion</Link>). Contact: <Contact />.
      </p>
    </>
  );
}
