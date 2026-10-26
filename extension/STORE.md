# Chrome Web Store: τι συμπληρώνετε

Όλα τα κείμενα είναι έτοιμα για αντιγραφή. Οι εικόνες βρίσκονται στον φάκελο `extension/store/`.

## 1. Λογαριασμός προγραμματιστή (μία φορά)

1. Ανοίξτε το https://chrome.google.com/webstore/devconsole και συνδεθείτε με τον λογαριασμό Google της επιχείρησης.
2. Αποδεχτείτε τους όρους και πληρώστε το εφάπαξ τέλος εγγραφής (5 $), μόνο μέσα στη σελίδα της Google.
   **Πριν πληρώσετε, στείλτε στιγμιότυπο στο Claude.**
3. Στο **Account** συμπληρώστε το όνομα του εκδότη (π.χ. «Βραχυχρόνια.ai») και επιβεβαιώστε το email επικοινωνίας.

## 2. Νέα επέκταση

**New item** → ανεβάστε το αρχείο **vrachychronia-extension.zip**. Το κατεβάζετε από
https://aivrachychronia.vercel.app/vrachychronia-extension.zip ή το βρίσκετε στο `property-manager/public/`.

## 3. Store listing

- **Τίτλος** (από το πακέτο): Βραχυχρόνια.ai – Δήλωση ΑΑΔΕ
- **Σύνοψη** (από το πακέτο): Συμπληρώνει μόνη της τη δήλωση βραχυχρόνιας διαμονής στην ΑΑΔΕ με τα στοιχεία της κράτησης από το Βραχυχρόνια.ai.
- **Περιγραφή:**

```
Η δήλωση βραχυχρόνιας διαμονής στην ΑΑΔΕ, χωρίς πληκτρολόγηση.

Ανοίγετε στο TAXISnet τη φόρμα «Υποβολή Νέας Δήλωσης» και η επέκταση τη γεμίζει μόνη της με την κράτηση από το Βραχυχρόνια.ai:
• Άφιξη και αναχώρηση
• Συνολικό συμφωνηθέν μίσθωμα
• Τρόπος πληρωμής και ηλεκτρονική πλατφόρμα (Airbnb, Booking.com κ.ά.)
• Αλλοδαπός, ονοματεπώνυμο, ΑΦΜ ή αριθμός διαβατηρίου/ταυτότητας
• Αριθμός κράτησης στις σημειώσεις

Αν περιμένουν δήλωση περισσότερες κρατήσεις, διαλέγετε ποια. Αν λείπει κάποιο στοιχείο από την κράτηση, σας το λέει.

Μόλις η ΑΑΔΕ δεχτεί την υποβολή σας, η κράτηση σημειώνεται μόνη της «Δηλώθηκε» στο Βραχυχρόνια.ai και με το «Επόμενη δήλωση» γεμίζει αμέσως η επόμενη.

Εσείς ελέγχετε και πατάτε την υποβολή. Η επέκταση δεν υποβάλλει ποτέ μόνη της και δεν βλέπει τους κωδικούς σας στο TAXISnet.

Πώς ξεκινάτε:
1. Εγκαταστήστε την επέκταση.
2. Στο Βραχυχρόνια.ai ανοίξτε Φορολογικά → Αυτόματη συμπλήρωση και πατήστε «Σύνδεση επέκτασης».
3. Ανοίξτε τη φόρμα της ΑΑΔΕ: γεμίζει μόνη της.

Χρειάζεται λογαριασμός στο Βραχυχρόνια.ai: https://aivrachychronia.vercel.app
```

- **Κατηγορία:** Productivity → Tools (Παραγωγικότητα → Εργαλεία)
- **Γλώσσα:** Ελληνικά
- **Εικονίδιο 128×128:** `extension/icons/icon128.png`
- **Στιγμιότυπα 1280×800:** `extension/store/screenshot-1-filled.png`, `screenshot-2-pick.png`, `screenshot-3-connect.png`
- **Small promo tile 440×280:** `extension/store/promo-small-440x280.png`
- **Αρχική σελίδα:** https://aivrachychronia.vercel.app
- **Υποστήριξη:** το email της επιχείρησης

## 4. Privacy practices

- **Single purpose:**
  > Συμπληρώνει τη φόρμα δήλωσης βραχυχρόνιας διαμονής της ΑΑΔΕ (www1.gsis.gr) με τα στοιχεία κρατήσεων του χρήστη από το Βραχυχρόνια.ai.
- **storage:**
  > Αποθηκεύει τοπικά το κλειδί σύνδεσης που δημιουργεί ο χρήστης στο Βραχυχρόνια.ai, για να διαβάζει τις κρατήσεις του που περιμένουν δήλωση.
- **scripting:**
  > Τρέχει τον κώδικα συμπλήρωσης, που περιέχεται στην επέκταση, στη σελίδα της φόρμας της ΑΑΔΕ, ώστε να γραφτούν οι τιμές στα πεδία της (η φόρμα χρησιμοποιεί PrimeFaces).
- **Host permissions:**
  > www1.gsis.gr/taxisnet/short_term_letting: η φόρμα δήλωσης που συμπληρώνεται. aivrachychronia.vercel.app: διαβάζει από τον λογαριασμό του χρήστη τις κρατήσεις που περιμένουν δήλωση, σημειώνει «Δηλώθηκε» την κράτηση που υπέβαλε ο χρήστης και παίρνει το κλειδί σύνδεσης από τη σελίδα «Αυτόματη συμπλήρωση».
- **Remote code:** No, I am not using remote code. Όλος ο κώδικας είναι μέσα στο πακέτο· από τον server έρχονται μόνο δεδομένα (JSON).
- **Data usage:** τσεκάρετε
  - **Personally identifiable information:** όνομα και ΑΦΜ ή αριθμός ταυτότητας/διαβατηρίου του επισκέπτη, για τη φόρμα.
  - **Financial and payment information:** το ποσό του μισθώματος και ο τρόπος πληρωμής, για τη φόρμα.

  Και τις τρεις δηλώσεις:
  - not sold to third parties
  - not used for unrelated purposes
  - not used for creditworthiness
- **Privacy policy URL:** https://aivrachychronia.vercel.app/privacy#extension

## 5. Distribution

- **Visibility:** προτείνεται **Unlisted** για την πρώτη έκδοση. Την εγκαθιστά μόνο όποιος έχει τον σύνδεσμο. Αφού
  τη δοκιμάσετε σε πραγματική δήλωση, την κάνετε **Public**.
- **Regions:** Greece, ή όλες.

## 6. Test instructions (για τον έλεγχο της Google)

```
The extension fills the Greek tax authority's (AADE) short-term rental declaration form on www1.gsis.gr, which requires Greek TAXISnet credentials, so reviewers cannot open that form.
The connection flow can be tested with the public demo account of the companion app:
1. Install the extension.
2. Open https://aivrachychronia.vercel.app/login, sign in with demo@demo-hospitality.test / demo1234.
3. Open https://aivrachychronia.vercel.app/tax/autofill and press «Σύνδεση επέκτασης»: the card shows that the extension is connected.
On the AADE form the extension shows a small panel (bottom right) and fills the fields; it never submits the form and never reads credentials.
```

## 7. Μετά την έγκριση

Εγκρίθηκε (Οκτώβριος 2026) ως **μη καταχωρισμένη**: https://chromewebstore.google.com/detail/edbgkhingmgkdgidcbnnpbgkakkihaag
Ο σύνδεσμος είναι μέσα στην εφαρμογή (η σελίδα «Αυτόματη συμπλήρωση» δείχνει «Εγκατάσταση επέκτασης»).
Με `NEXT_PUBLIC_EXTENSION_URL` στο Vercel αλλάζει, αν χρειαστεί.

Κάθε διόρθωση στη συμπλήρωση χρειάζεται νέα έκδοση: `npm run build:extension` → ανέβασμα του νέου zip → Submit for review.
