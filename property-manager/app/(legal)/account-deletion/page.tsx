import type { Metadata } from "next";
import { APP_NAME, SUPPORT_EMAIL } from "@/lib/brand";

export const metadata: Metadata = { title: "Διαγραφή λογαριασμού · Delete account" };

export default function AccountDeletionPage() {
  return (
    <>
      <h1>Διαγραφή λογαριασμού</h1>
      <p>Μπορείτε να διαγράψετε τον λογαριασμό σας στο {APP_NAME} και τα δεδομένα του οποιαδήποτε στιγμή.</p>

      <h2>Από την εφαρμογή Android</h2>
      <ul>
        <li>Ανοίξτε την εφαρμογή και συνδεθείτε.</li>
        <li>Πατήστε <strong>Περισσότερα</strong> → <strong>Διαγραφή λογαριασμού</strong>.</li>
        <li>Επιβεβαιώστε με τον κωδικό σας.</li>
      </ul>

      <h2>Από τον browser</h2>
      <ul>
        <li>Συνδεθείτε στην εφαρμογή web.</li>
        <li>Πηγαίνετε στις <strong>Ρυθμίσεις</strong> → <strong>Διαγραφή λογαριασμού</strong> και επιβεβαιώστε με τον κωδικό σας.</li>
      </ul>
      {SUPPORT_EMAIL && (
        <p>
          Αν δεν μπορείτε να συνδεθείτε, στείλτε email στο <a className="text-accent underline" href={`mailto:${SUPPORT_EMAIL}?subject=Account%20deletion`}>{SUPPORT_EMAIL}</a> από τη διεύθυνση του λογαριασμού σας.
        </p>
      )}

      <h2>Τι διαγράφεται</h2>
      <ul>
        <li>Ο λογαριασμός σας (όνομα, email, κωδικός) και το ιστορικό συνομιλιών με τον βοηθό AI — αμέσως και οριστικά.</li>
        <li>Αν είστε το μόνο μέλος ενός οργανισμού: ο οργανισμός και όλα τα δεδομένα του (ακίνητα, επισκέπτες, κρατήσεις, εργασίες, μηνύματα, οικονομικά).</li>
        <li>Αν ο οργανισμός έχει κι άλλα μέλη: αφαιρείστε από αυτόν· τα κοινά δεδομένα του οργανισμού παραμένουν για τα υπόλοιπα μέλη.</li>
      </ul>
      <p>Δεν κρατάμε αντίγραφα των διαγραμμένων δεδομένων, εκτός από τα αυτόματα αντίγραφα ασφαλείας του παρόχου βάσης δεδομένων, τα οποία ανακυκλώνονται εντός 30 ημερών.</p>

      <h2>Delete your account (English)</h2>
      <p>
        In the Android app: <strong>Περισσότερα → Διαγραφή λογαριασμού</strong> (More → Delete account). On the web: <strong>Ρυθμίσεις → Διαγραφή λογαριασμού</strong> (Settings → Delete account). Confirm with your password.
        Your account and AI chat history are deleted immediately; organizations where you are the only member are deleted with all
        their data. In shared organizations only your membership is removed. Database backups roll over within 30 days.
      </p>
    </>
  );
}
