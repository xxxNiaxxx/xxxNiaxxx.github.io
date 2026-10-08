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
| [Vercel](https://vercel.com/signup) | δωρεάν πλάνο | φιλοξενία του server |
| [Neon](https://neon.tech) | δωρεάν πλάνο | βάση δεδομένων PostgreSQL |
| ένα email υποστήριξης | — | εμφανίζεται στο Play και στην πολιτική απορρήτου |

> **Σημαντικό για νέους προσωπικούς λογαριασμούς developer:** η Google ζητά πρώτα
> **κλειστή δοκιμή (closed testing) με τουλάχιστον 12 δοκιμαστές για 14 συνεχόμενες ημέρες**.
> Μόνο μετά μπορείτε να ζητήσετε δημοσίευση για όλους (production).
> Ξεκινήστε τη δοκιμή νωρίς (βήμα 6).

## 1. Βάση δεδομένων (Neon)

1. Δημιουργήστε project στο Neon (περιοχή: Frankfurt / `eu-central-1`).
2. Από το **Connection details** αντιγράψτε **δύο** διευθύνσεις:
   - **Pooled connection** (έχει `-pooler` στο όνομα): θα είναι το `DATABASE_URL`
   - **Direct connection**: θα είναι το `DIRECT_URL`

## 2. Server (Vercel)

1. Στο Vercel: **Add New → Project** και επιλέξτε το repository `xxxNiaxxx.github.io` στο GitHub.
2. **Root Directory:** `property-manager`
3. **Build Command:** `npm run vercel-build` (εφαρμόζει τα migrations της βάσης και μετά κάνει build)
4. **Environment Variables:**

   | Όνομα | Τιμή |
   | --- | --- |
   | `DATABASE_URL` | Neon pooled URL |
   | `DIRECT_URL` | Neon direct URL |
   | `AUTH_SECRET` | τρέξτε `openssl rand -base64 32` και επικολλήστε το αποτέλεσμα |
   | `NEXT_PUBLIC_APP_URL` | `https://YOUR-APP.vercel.app` |
   | `NEXT_PUBLIC_SUPPORT_EMAIL` | το email υποστήριξης |
   | `NEXT_PUBLIC_APP_TIMEZONE` | `Europe/Athens` |
   | `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL` | προαιρετικά: χωρίς αυτά δουλεύει ο offline βοηθός |

5. **Deploy.** Ελέγξτε ότι ανοίγουν:
   - `https://YOUR-APP.vercel.app/login`
   - `https://YOUR-APP.vercel.app/privacy` (πολιτική απορρήτου, χρειάζεται για το Play)
   - `https://YOUR-APP.vercel.app/account-deletion` (διαγραφή λογαριασμού, χρειάζεται για το Play)

6. **Λογαριασμός για τον έλεγχο της Google.** Η Google θέλει στοιχεία σύνδεσης για να δοκιμάσει την εφαρμογή.
   Φορτώστε τα demo δεδομένα στη βάση παραγωγής από τον υπολογιστή σας:

   ```bash
   cd property-manager
   DATABASE_URL="<pooled>" DIRECT_URL="<direct>" npm run db:seed
   ```

   Ο λογαριασμός είναι `demo@demo-hospitality.test` / `demo1234`. Το seed μπορείτε να το ξανατρέξετε
   όποτε θέλετε: επαναφέρει μόνο τον demo οργανισμό.

## 3. Ρύθμιση της εφαρμογής Android

1. Στο `mobile/eas.json` αλλάξτε **και τις δύο** τιμές `https://YOUR-APP.vercel.app` με τη διεύθυνση του Vercel.
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
| App access | «All or some functionality is restricted» → οδηγίες: email `demo@demo-hospitality.test`, κωδικός `demo1234` |
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
| Personal info | Other info | ✔ (σημειώσεις επισκεπτών) | Optional | App functionality |
| Financial info | Other financial info | ✔ (έσοδα/έξοδα καταλυμάτων) | Optional | App functionality |
| Messages | Other in-app messages | ✔ (μηνύματα προς επισκέπτες) | Optional | App functionality |
| App activity | Other user-generated content | ✔ (συνομιλίες AI) | Optional | App functionality |

Όλα τα δεδομένα: **not processed ephemerally** (αποθηκεύονται). **Δεν** συλλέγονται τοποθεσία, επαφές,
φωτογραφίες, αναγνωριστικά συσκευής ή διαφημιστικά IDs.

## 8. Σελίδα στο Play (Store listing)

**Όνομα** (έως 30 χαρακτήρες)
```
Βραχυχρόνια.ai
```

**Σύντομη περιγραφή** (έως 80 χαρακτήρες)
```
Κρατήσεις, καθαρισμοί και έσοδα των καταλυμάτων σας, με βοηθό AI.
```

**Πλήρης περιγραφή**
```
Το Βραχυχρόνια.ai είναι ο ψηφιακός διαχειριστής για ιδιοκτήτες και διαχειριστές καταλυμάτων βραχυχρόνιας μίσθωσης.

Ανοίγετε την εφαρμογή και βλέπετε αμέσως τι χρειάζεται την προσοχή σας σήμερα:
• Αφίξεις και αναχωρήσεις της ημέρας
• Καθαρισμοί και εργασίες συντήρησης, με λίστα ελέγχου
• Εργασίες που έχουν καθυστερήσει
• Επισκέπτες που δεν έχουν λάβει οδηγίες check-in
• Κρατήσεις με στοιχεία που λείπουν

Ημερολόγιο διαθεσιμότητας
Δείτε με μια ματιά ποια καταλύματα είναι κλεισμένα τις επόμενες 14 ημέρες και όλες τις αφίξεις και αναχωρήσεις του μήνα.

Βοηθός τεχνητής νοημοσύνης
Ρωτήστε σε φυσική γλώσσα: «Ποιος κάνει check-in αύριο;», «Πόσα έβγαλα αυτόν τον μήνα;», «Ποιο κατάλυμα αποδίδει καλύτερα;». Ο βοηθός απαντά μόνο από τα πραγματικά σας δεδομένα. Μπορεί να ετοιμάσει μηνύματα προς επισκέπτες ή νέες εργασίες, αλλά τίποτα δεν εκτελείται χωρίς τη δική σας έγκριση.

Ομάδα
Αναθέστε καθαρισμούς και επισκευές σε συνεργάτες και παρακολουθήστε την πρόοδο σε πραγματικό χρόνο.

Πλήρης διαχείριση από τον υπολογιστή
Ακίνητα, επισκέπτες, κρατήσεις και οικονομικές αναφορές είναι διαθέσιμα και από την εφαρμογή web, με τον ίδιο λογαριασμό.

Τα δεδομένα σας είναι ιδιωτικά: κάθε οργανισμός βλέπει μόνο τα δικά του, όλη η επικοινωνία είναι κρυπτογραφημένη και μπορείτε να διαγράψετε τον λογαριασμό σας ανά πάσα στιγμή από την εφαρμογή.
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
