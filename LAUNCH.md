# Τελευταία βήματα πριν το άνοιγμα

Όλα τα βήματα γίνονται από εσάς, σε λογαριασμούς που μόνο εσείς έχετε. Κανέναν κωδικό, κλειδί ή connection
string δεν χρειάζεται να στείλετε σε κανέναν: τα βάζετε απευθείας στο Vercel ή στο GitHub.

Σειρά: **τώρα** → **Νοέμβριος** (κλειστή δοκιμή) → **Δεκέμβριος** (έναρξη, πληρωμές) → **1 Ιανουαρίου 2027**.

---

## Τώρα

### 1. Vercel — μεταβλητές και redeploy
Project → **Settings → Environment Variables**. Η πλήρης λίστα είναι στο `mobile/PLAY_STORE.md`, βήμα 2.
Βεβαιωθείτε ότι υπάρχουν:

- [ ] `ADMIN_EMAILS` — το email σας (λίστα αναμονής, σχόλια, **email για σφάλματα**, σελίδα Οργανισμοί)
- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` — χωρίς αυτά δεν φεύγει κανένα email
- [ ] `CRON_SECRET` — ο πρωινός συγχρονισμός ημερολογίων, οι υπενθυμίσεις και η συνδρομή
- [ ] `NEXT_PUBLIC_APP_URL` = `https://aivrachychronia.vercel.app`
- [ ] `NEXT_PUBLIC_SUPPORT_EMAIL`
- [ ] `NEXT_PUBLIC_OPERATOR_NAME` — το όνομά σας (και ΑΦΜ όταν κάνετε έναρξη), για τους Όρους και το GDPR
- [ ] `AI_API_KEY` (κλειδί OpenAI, με προπληρωμή 5–10 $) και `AI_MODEL` = `gpt-4o-mini` — προαιρετικά

Μετά: **Deployments → … → Redeploy**. Έλεγχος, πρέπει να ανοίγουν:
- [ ] `/api/health` → `{"ok":true}`
- [ ] `/terms`, `/dpa`, `/privacy`, `/account-deletion`

### 2. Ο λογαριασμός επίδειξης (demo)
Ο `demo@demo-hospitality.test` μένει για να δοκιμάζουν όσοι ενδιαφέρονται. Είναι προστατευμένος:
επαναφέρεται μόνος του κάθε βράδυ, δεν επιτρέπει αλλαγή κωδικού, διαγραφή, προσκλήσεις ή συνδρομή, δεν στέλνει
email και έχει μικρό ημερήσιο όριο στον βοηθό AI.
- [ ] Αν θέλετε να φαίνονται τα στοιχεία σύνδεσης στη σελίδα εισόδου: Vercel → `SHOW_DEMO_LOGIN` = `1` → Redeploy
- [ ] Συνδεθείτε μία φορά ως demo και δείτε την ένδειξη «Λογαριασμός επίδειξης»

### 3. Ο δικός σας λογαριασμός
- [ ] Συνδεθείτε και πατήστε **«Αποδέχομαι»** στους νέους όρους
- [ ] Εισαγωγή του αρχείου κρατήσεων της Booking (Κρατήσεις → Εισαγωγή)
- [ ] **Βοηθός AI → Γνώσεις → Ο βοηθός σάς ρωτά**, για κάθε κατάλυμα (ώρες, είσοδος, Wi-Fi, κανόνες…)
- [ ] Ημερολόγια iCal ανά κατάλυμα, αν δεν τα έχετε βάλει
- [ ] Ρυθμίσεις → Ασφάλεια: αλλάξτε κωδικό αν τον έχετε δώσει ποτέ σε κάποιον

### 4. Αντίγραφα ασφαλείας (GitHub)
GitHub → repository → **Settings → Secrets and variables → Actions → New repository secret**:
- [ ] `BACKUP_DATABASE_URL` — το connection string του Neon **χωρίς** `-pooler`
- [ ] `BACKUP_PASSPHRASE` — μια μεγάλη φράση. **Γράψτε τη σε χαρτί ή σε password manager**: χωρίς αυτή τα αντίγραφα δεν ανοίγουν.
- [ ] **Actions → Database backup → Run workflow** και ελέγξτε ότι τελειώνει πράσινο

### 5. Ειδοποίηση αν πέσει η σελίδα
- [ ] [uptimerobot.com](https://uptimerobot.com) (δωρεάν) → New monitor → HTTP(s) → `https://aivrachychronia.vercel.app/api/health`, κάθε 5 λεπτά, ειδοποίηση στο email σας

### 6. Android και Google Play
Αναλυτικά στο `mobile/PLAY_STORE.md`, βήματα 4–8 (κείμενα, γραφικά και απαντήσεις Data safety είναι έτοιμα).
- [ ] `eas build -p android --profile production` (το νέο logo μπαίνει μόνο με νέο build)
- [ ] Play Console: εφαρμογή, Store listing, Data safety, App access
- [ ] Ανέβασμα στο Internal testing → δοκιμή στο δικό σας κινητό
- [ ] **Closed testing** με 12+ δοκιμαστές από τη λίστα αναμονής → ξεκινά η μέτρηση των **14 ημερών**
- [ ] `PLAY_TESTING_URL` στο Vercel = ο σύνδεσμος «Join on the web» του closed testing → Redeploy

---

## Νοέμβριος

### 7. Stripe σε δοκιμαστική λειτουργία (test mode)
1. [ ] Λογαριασμός στο [stripe.com](https://stripe.com), χώρα **Ελλάδα**. Μένετε στο **Test mode**.
2. [ ] **Product catalog → Add product**: «Βραχυχρόνια.ai — κατάλυμα», **Recurring, Monthly, 12,00 EUR**,
       τύπος τιμής **Per unit**. Αντιγράψτε το **Price ID** (`price_…`).
3. [ ] **Developers → API keys**: αντιγράψτε το **Secret key** (`sk_test_…`).
4. [ ] **Developers → Webhooks → Add endpoint**: `https://aivrachychronia.vercel.app/api/billing/webhook`,
       γεγονότα `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
       `customer.subscription.deleted`. Αντιγράψτε το **Signing secret** (`whsec_…`).
5. [ ] **Settings → Billing → Customer portal**: ενεργοποιήστε αλλαγή κάρτας, ιστορικό τιμολογίων και ακύρωση → Save.
6. [ ] **Settings → Customer emails**: ενεργοποιήστε αποδείξεις και email για αποτυχημένες πληρωμές.
7. [ ] Vercel: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` → Redeploy.
8. [ ] Σε έναν δοκιμαστικό λογαριασμό (όχι στον δικό σας, που είναι πάντα δωρεάν): **Συνδρομή → Ενεργοποίηση**,
       κάρτα δοκιμής `4242 4242 4242 4242`, οποιαδήποτε μελλοντική ημερομηνία και CVC. Η σελίδα πρέπει να δείξει
       «Ενεργή · πρώτη χρέωση 1/1/2027». Δοκιμάστε και «Κάρτα, τιμολόγια, ακύρωση».

### 8. Λογιστής
- [ ] Έναρξη δραστηριότητας (ΚΑΔ υπηρεσιών λογισμικού / SaaS), καθεστώς ΦΠΑ, κατηγορία ΕΦΚΑ — πριν την πρώτη χρέωση
- [ ] Πώς εκδίδονται οι αποδείξεις στο myDATA για κάθε πληρωμή (δωρεάν timologio ή πάροχος ~5–15 €/μήνα)

---

## Δεκέμβριος

- [ ] **Stripe → Activate account**: στοιχεία επιχείρησης (ΑΦΜ από την έναρξη), IBAN για τις πληρωμές
- [ ] Επαναλάβετε τα βήματα 7.2–7.6 στο **Live mode** (νέο Price ID, `sk_live_…`, νέο webhook και signing secret)
      και αντικαταστήστε τα τρία κλειδιά στο Vercel → Redeploy
- [ ] `NEXT_PUBLIC_OPERATOR_NAME` με την επωνυμία και το ΑΦΜ → Redeploy
- [ ] **Vercel → Upgrade to Pro** (υποχρεωτικό από την πρώτη χρέωση) και **Spend limit**
- [ ] Δωρεάν για πάντα όσους θέλετε (συνεργάτες, testers): **Οργανισμοί → «Δωρεάν»**
- [ ] 1 και 24 Δεκεμβρίου η εφαρμογή στέλνει μόνη της email «η δωρεάν περίοδος λήγει» σε όσους δεν έχουν συνδρομή

## 1 Ιανουαρίου 2027

- Όσοι ενεργοποίησαν συνδρομή χρεώνονται αυτόματα.
- Όσοι όχι, βλέπουν μόνο τη σελίδα Συνδρομή και τις Ρυθμίσεις και μπορούν να κατεβάσουν όλα τα δεδομένα τους.
- Δείτε στη σελίδα **Οργανισμοί** ποιοι πληρώνουν και πόσα μπαίνουν τον μήνα.

---

## Προαιρετικά
- Δικό σας domain (~10–20 €/χρόνο): Vercel → Settings → Domains. Μετά αλλάξτε `NEXT_PUBLIC_APP_URL`,
  τη διεύθυνση του webhook στο Stripe και το `EXPO_PUBLIC_API_URL` στο `mobile/eas.json` (νέο build).
- Neon Launch (από ~5 $/μήνα, επαναφορά 7 ημερών) όταν αποκτήσετε αρκετούς πελάτες.
