# Ανέβασμα στο Google Play — οδηγός βήμα-βήμα

Ο οδηγός ακολουθεί τη σειρά που θα κάνετε τα βήματα. Ό,τι γράφει
`YOUR-APP` αντικαταστήστε το με τη δική σας διεύθυνση.

> Οι κανόνες του Google Play αλλάζουν συχνά. Αν κάτι στην οθόνη σας διαφέρει
> από τον οδηγό, ισχύει αυτό που λέει το Play Console.

## 0. Τι θα χρειαστείτε

| Λογαριασμός | Κόστος | Γιατί |
| --- | --- | --- |
| [Google Play Console](https://play.google.com/console/signup) | 25 $ εφάπαξ | δημοσίευση εφαρμογής |
| [Expo](https://expo.dev/signup) | δωρεάν | build της εφαρμογής Android στο cloud (EAS) |
| [Vercel](https://vercel.com/signup) | δωρεάν για τη δοκιμή· **Pro ~20 $/μήνα από την πρώτη χρέωση πελάτη** (το Hobby είναι μόνο για μη εμπορική χρήση) | φιλοξενία του server |
| [Neon](https://neon.tech) | δωρεάν πλάνο | βάση δεδομένων PostgreSQL |
| ένα email υποστήριξης | — | εμφανίζεται στο Play και στην πολιτική απορρήτου |

> **Σημαντικό για νέους προσωπικούς λογαριασμούς developer:** η Google ζητά πρώτα
> **κλειστή δοκιμή (closed testing) με τουλάχιστον 12 δοκιμαστές για 14 συνεχόμενες ημέρες**.
> Μόνο μετά μπορείτε να ζητήσετε δημοσίευση για όλους (production).
> Ξεκινήστε τη δοκιμή νωρίς (βήμα 6).

## 1. Βάση δεδομένων (Neon)

1. Δημιουργήστε project στο Neon (περιοχή: Frankfurt / `eu-central-1`).
   Αν έχετε ήδη project από τις δοκιμές στον υπολογιστή, μπορείτε να χρησιμοποιήσετε το ίδιο.
2. Από το **Connect** αντιγράψτε **δύο** διευθύνσεις:
   - με ενεργό το **Connection pooling** (έχει `-pooler` στο όνομα): θα είναι το `DATABASE_URL`
   - χωρίς pooling: θα είναι το `DIRECT_URL`
3. **Αν η βάση έχει τα δοκιμαστικά δεδομένα** (`npm run db:seed` από τις δοκιμές), ο λογαριασμός
   `demo@demo-hospitality.test` έχει τον γνωστό κωδικό `demo1234`. Πριν ανεβεί online, σβήστε τα
   από τον φάκελο `property-manager` (με το `.env` να δείχνει στο Neon):

   ```bash
   npm run db:remove-demo
   ```

   Σβήνει **μόνο** τον οργανισμό «Demo Hospitality» και τους demo χρήστες — όχι τα δικά σας δεδομένα.

## 2. Server (Vercel)

1. Στο Vercel: **Add New → Project** και επιλέξτε το repository `xxxNiaxxx.github.io` στο GitHub.
2. **Root Directory:** `property-manager` (πατήστε **Edit** δίπλα στο Root Directory).
   Το Framework Preset γίνεται αυτόματα **Next.js**.
3. **Build Command:** τίποτα — το `property-manager/vercel.json` ορίζει ήδη `npm run vercel-build`
   (εφαρμόζει τα migrations της βάσης και μετά κάνει build) και περιοχή **Φρανκφούρτη** (`fra1`),
   δίπλα στη βάση του Neon.
4. **Environment Variables:**

   | Όνομα | Τιμή |
   | --- | --- |
   | `DATABASE_URL` | Neon pooled URL |
   | `DIRECT_URL` | Neon direct URL |
   | `AUTH_SECRET` | ένα **νέο**, μακρύ τυχαίο κείμενο (όχι αυτό του υπολογιστή σας). Στα Windows: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
   | `NEXT_PUBLIC_APP_URL` | `https://YOUR-APP.vercel.app` |
   | `NEXT_PUBLIC_SUPPORT_EMAIL` | το email υποστήριξης |
   | `NEXT_PUBLIC_APP_TIMEZONE` | `Europe/Athens` |
   | `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL` | προαιρετικά: χωρίς αυτά δουλεύει ο offline βοηθός |
   | `CRON_SECRET` | ένα μακρύ τυχαίο κείμενο — ενεργοποιεί τον νυχτερινό συγχρονισμό των ημερολογίων iCal |
   | `ADMIN_EMAILS` | το email σας — βλέπετε και εγκρίνετε τη λίστα αναμονής (`/admin/waitlist`) |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | αποστολή email. Gmail: `smtp.gmail.com`, `465`, το Gmail σας και ένας **κωδικός εφαρμογής** (Λογαριασμός Google → Ασφάλεια → Κωδικοί εφαρμογών) |
   | `EMAIL_FROM` | προαιρετικό, π.χ. `Βραχυχρόνια.ai <you@gmail.com>` |
   | `PLAY_TESTING_URL` | ο σύνδεσμος συμμετοχής της κλειστής δοκιμής (βλ. βήμα 6) — μπαίνει στο email έγκρισης των χρηστών Android |
   | `NEXT_PUBLIC_OPERATOR_NAME` | το όνομά σας ή της επιχείρησης (και ΑΦΜ) — εμφανίζεται στους Όρους χρήσης και στη Σύμβαση GDPR |
   | `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` | συνδρομές (βλ. `LAUNCH.md`) — χωρίς αυτά η σελίδα «Συνδρομή» γράφει ότι οι πληρωμές δεν έχουν ενεργοποιηθεί |
   | `NEXT_PUBLIC_PRICE_PER_PROPERTY` | προαιρετικό, η τιμή που φαίνεται (προεπιλογή 12) |

5. **Deploy.** Ελέγξτε ότι ανοίγουν:
   - `https://YOUR-APP.vercel.app/login`
   - `https://YOUR-APP.vercel.app/privacy` (πολιτική απορρήτου, χρειάζεται για το Play)
   - `https://YOUR-APP.vercel.app/account-deletion` (διαγραφή λογαριασμού, χρειάζεται για το Play)

6. **Λογαριασμός για τον έλεγχο της Google.** Η Google θέλει στοιχεία σύνδεσης για να δοκιμάσει την εφαρμογή.
   Φορτώστε τα demo δεδομένα με **δικό σας, ιδιωτικό κωδικό** (όχι `demo1234`, που είναι δημόσια γνωστός),
   από τον φάκελο `property-manager` με το `.env` να δείχνει στο Neon:

   ```bash
   # Windows (Command Prompt)
   set DEMO_PASSWORD=ένας-δικός-σας-κωδικός
   npm run db:seed

   # Mac / Linux
   DEMO_PASSWORD="ένας-δικός-σας-κωδικός" npm run db:seed
   ```

   Δώστε στη Google το `demo@demo-hospitality.test` και αυτόν τον κωδικό. Online η σελίδα σύνδεσης
   **δεν** δείχνει τα στοιχεία του demo (εκτός αν βάλετε `SHOW_DEMO_LOGIN=1` στο Vercel).
   Το seed επαναφέρει μόνο τον demo οργανισμό· `npm run db:remove-demo` τον σβήνει όταν δεν χρειάζεται.

## 3. Ρύθμιση της εφαρμογής Android

1. Το `mobile/eas.json` δείχνει ήδη στο `https://aivrachychronia.vercel.app` (και στα δύο profiles).
   Αν αλλάξει η διεύθυνση του Vercel, αλλάξτε τη και εκεί.
2. **Package name:** στο `mobile/app.json` είναι `ai.brachychronia.app`.
   **Αφού ανεβεί η πρώτη έκδοση στο Play, δεν αλλάζει ποτέ.** Αν θέλετε άλλο, αλλάξτε το τώρα
   (π.χ. `gr.toonomasas.brachychronia`).

## 4. Build με EAS

```bash
npm install -g eas-cli
cd mobile
npm install
eas login                      # ο λογαριασμός Expo
eas init                       # συνδέει το project, προσθέτει projectId στο app.json
eas build -p android --profile preview      # APK για δοκιμή στο κινητό σας (προαιρετικό)
eas build -p android --profile production   # .aab για το Google Play
```

- Την πρώτη φορά το EAS ρωτά αν θα δημιουργήσει **keystore**. Απαντήστε **Yes**.
  Το φυλάει το Expo. Μη το χάσετε: με αυτό υπογράφονται όλες οι επόμενες ενημερώσεις.
- Όταν τελειώσει το build, κατεβάστε το αρχείο `.aab` από τη σελίδα του build στο expo.dev.
- Το APK του `preview` εγκαθίσταται απευθείας στο κινητό σας (σκανάρετε το QR του build).

## 5. Δημιουργία εφαρμογής στο Play Console

**Create app:**
- Όνομα: `Βραχυχρόνια.ai`
- Γλώσσα: Ελληνικά
- Τύπος: App
- Δωρεάν

Στη συνέχεια, στο **Dashboard → Set up your app**:

| Ενότητα | Τι βάζετε |
| --- | --- |
| Privacy policy | `https://YOUR-APP.vercel.app/privacy` |
| App access | «All or some functionality is restricted» → οδηγίες: email `demo@demo-hospitality.test` και ο **ιδιωτικός** κωδικός `DEMO_PASSWORD` του βήματος 2.6 (όχι `demo1234`) |
| Ads | No, my app does not contain ads |
| Content rating | Συμπληρώστε το ερωτηματολόγιο: κατηγορία *Utility/Productivity*, όχι σε όλα τα «ευαίσθητα» θέματα |
| Target audience | 18 και άνω |
| News app | No |
| Data safety | δείτε την ενότητα 7 παρακάτω |
| Government apps / Financial features / Health | No / None / None |
| App category | **Business**, με email επικοινωνίας το email υποστήριξης |
| Store listing | κείμενα και εικόνες: ενότητα 8 |

## 6. Πρώτο ανέβασμα και κλειστή δοκιμή

1. **Testing → Internal testing → Create new release.** Ανεβάστε το `.aab`.
   Το **πρώτο** ανέβασμα γίνεται υποχρεωτικά με το χέρι.
   Αποδεχτείτε το **Play App Signing**.
2. Προσθέστε το email σας στους testers. Ανοίξτε τον σύνδεσμο συμμετοχής στο κινητό και εγκαταστήστε την εφαρμογή.
3. **Testing → Closed testing:** δημιουργήστε track, προσθέστε **12+ δοκιμαστές** (λίστα email ή Google Group)
   και κάντε release την ίδια έκδοση. Μετρήστε **14 ημέρες**.
   - Τους δοκιμαστές τους βρίσκετε από τη **λίστα αναμονής** (`/admin/waitlist`): εγκρίνετε όσους θέλετε και πατήστε
     **«Αντιγραφή Gmail για Google Play»** — επικολλήστε τα στη λίστα email του track.
   - Αντιγράψτε τον σύνδεσμο **«Join on the web»** του track στη μεταβλητή `PLAY_TESTING_URL` στο Vercel, για να
     τον λαμβάνουν αυτόματα στο email έγκρισης.
4. Μετά: **Production → Apply for production access → Create release.**

Επόμενες εκδόσεις:

```bash
eas build -p android --profile production   # ο versionCode αυξάνεται αυτόματα
eas submit -p android --latest              # προαιρετικό: απαιτεί service-account key του Play Console
```

## 7. Data safety — απαντήσεις

- **Does your app collect or share user data?** Yes
- **Is all data encrypted in transit?** Yes (HTTPS)
- **Do you provide a way for users to request deletion?** Yes, μέσα στην εφαρμογή (Περισσότερα → Διαγραφή λογαριασμού)
  και URL: `https://YOUR-APP.vercel.app/account-deletion`
- **Data shared with third parties:** κανένα. Αν ενεργοποιήσετε `AI_API_KEY`, ο πάροχος AI επεξεργάζεται
  δεδομένα για λογαριασμό σας (service provider). Η Google δεν το θεωρεί «sharing».

| Κατηγορία | Τύπος | Collected | Required / Optional | Σκοπός |
| --- | --- | --- | --- | --- |
| Personal info | Name | ✔ | Required | App functionality, Account management |
| Personal info | Email address | ✔ | Required | App functionality, Account management |
| Personal info | Phone number | ✔ (τηλέφωνα επισκεπτών) | Optional | App functionality |
| Personal info | Other info | ✔ (σημειώσεις επισκεπτών· ΑΦΜ ή αριθμός διαβατηρίου για τη δήλωση διαμονής στην ΑΑΔΕ) | Optional | App functionality |
| Financial info | Other financial info | ✔ (έσοδα/έξοδα καταλυμάτων) | Optional | App functionality |
| Messages | Other in-app messages | ✔ (μηνύματα προς επισκέπτες) | Optional | App functionality |
| App activity | Other user-generated content | ✔ (συνομιλίες AI) | Optional | App functionality |

Η φόρμα της λίστας αναμονής, το online check-in των επισκεπτών και οι πληρωμές της συνδρομής (Stripe) γίνονται
στον ιστότοπο, όχι μέσα στην εφαρμογή. Η εφαρμογή Android **δεν** πουλάει τίποτα και δεν έχει συνδέσμους πληρωμής
(κανόνες πληρωμών του Google Play): η συνδρομή ενεργοποιείται μόνο από τον υπολογιστή.

Όλα τα δεδομένα: **not processed ephemerally** (αποθηκεύονται). **Δεν** συλλέγονται τοποθεσία, επαφές,
φωτογραφίες, αναγνωριστικά συσκευής ή διαφημιστικά IDs.

## 8. Σελίδα στο Play (Store listing)

**Όνομα** (έως 30 χαρακτήρες)
```
Βραχυχρόνια.ai
```

**Σύντομη περιγραφή** (έως 80 χαρακτήρες)
```
Κρατήσεις, ΑΑΔΕ, φόροι και check-in των καταλυμάτων σας, με βοηθό AI.
```

**Πλήρης περιγραφή**
```
Το Βραχυχρόνια.ai είναι ο ψηφιακός διαχειριστής για Έλληνες ιδιοκτήτες και διαχειριστές καταλυμάτων βραχυχρόνιας μίσθωσης — στα ελληνικά, με τους ελληνικούς κανόνες.

Τι χρειάζεται την προσοχή σας σήμερα
• Αφίξεις, αναχωρήσεις και καθαρισμοί της ημέρας
• Δηλώσεις διαμονής στην ΑΑΔΕ που πλησιάζει η προθεσμία τους
• Διπλοκρατήσεις ανάμεσα σε Airbnb, Booking.com και άλλες πλατφόρμες
• Εργασίες που καθυστερούν

Κρατήσεις από όλες τις πλατφόρμες
Συγχρονισμός ημερολογίων (iCal) με Airbnb, Booking.com, Vrbo και άλλες, και εισαγωγή του αρχείου κρατήσεων της Booking. Μία εικόνα για όλα τα καταλύματα.

ΑΑΔΕ και φόροι
Έτοιμα στοιχεία για τη δήλωση διαμονής (ΑΜΑ, αριθμός κράτησης, ΑΦΜ/διαβατήριο, ποσό) με αντιγραφή σε ένα κλικ, Τέλος Ανθεκτικότητας, προμήθειες, ΦΠΑ και καθαρό ποσό ανά κράτηση, πακέτο για τον λογιστή σε Excel.

Online check-in και οδηγός επισκέπτη
Ο επισκέπτης συμπληρώνει μόνος του τα στοιχεία του, στη γλώσσα του. Οδηγός με Wi-Fi, πάρκινγκ και κανόνες, και σελίδα απευθείας κρατήσεων χωρίς προμήθεια.

Βοηθός τεχνητής νοημοσύνης
Γράφει απαντήσεις στους επισκέπτες στη γλώσσα τους, απαντά σε ερωτήσεις όπως «Πόσα έβγαλα αυτόν τον μήνα;» και μαθαίνει το κατάλυμά σας κάνοντάς σας ερωτήσεις ή διαβάζοντας τη σελίδα σας στο Booking.com. Τίποτα δεν εκτελείται χωρίς τη δική σας έγκριση.

Ομάδα
Αναθέστε καθαρισμούς και επισκευές σε συνεργάτες και δείτε την πρόοδο σε πραγματικό χρόνο.

Τα δεδομένα σας είναι ιδιωτικά: κάθε λογαριασμός βλέπει μόνο τα δικά του, οι διακομιστές είναι στην ΕΕ (Φρανκφούρτη), όλη η επικοινωνία είναι κρυπτογραφημένη και μπορείτε να διαγράψετε τον λογαριασμό σας ανά πάσα στιγμή από την εφαρμογή.
```

**Γραφικά** (έτοιμα στον φάκελο `mobile/store/`)

| Πεδίο Play | Αρχείο |
| --- | --- |
| App icon (512×512) | `store/play-icon-512.png` |
| Feature graphic (1024×500) | `store/feature-graphic-1024x500.png` |
| Phone screenshots (2–8) | `store/screenshots/01-home.png` … `05-reservation.png` (1080×2100) |

Τα screenshots είναι από τα demo δεδομένα. Μπορείτε να τα αντικαταστήσετε με δικά σας από το κινητό.

## 9. Έλεγχος πριν πατήσετε «Publish»

- [ ] Ο server στο Vercel ανοίγει και η σύνδεση με το demo λειτουργεί από την εφαρμογή (APK `preview`)
- [ ] Οι σελίδες `/privacy` και `/account-deletion` ανοίγουν και δείχνουν το email υποστήριξης
- [ ] Το `eas.json` δείχνει στη σωστή διεύθυνση (όχι `YOUR-APP`)
- [ ] Είστε σίγουροι για το package name
- [ ] Data safety, Content rating, Target audience, App access: όλα σε κατάσταση ✔
