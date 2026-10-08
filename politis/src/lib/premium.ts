/**
 * Freemium model.
 *
 * Rule: information about citizens' rights is ALWAYS free (benefits, eligibility check,
 * procedures, official sources, tasks, basic reminders). Plus sells convenience only.
 *
 * Purchases are not connected yet (PURCHASES_ENABLED = false): the Plus screen offers a clearly
 * labelled demo activation. Real billing will go through Google Play Billing / App Store, and the
 * entitlement must then be verified server-side (Supabase), not trusted from the device.
 */
export const PURCHASES_ENABLED = false;

export const FREE_ASSISTANT_QUESTIONS_PER_MONTH = 5;

export type PlusFeatureId = 'unlimitedAssistant' | 'familyProfiles' | 'smartReminders' | 'newProgramAlerts' | 'weeklyDigest';

export interface PlusFeature {
  id: PlusFeatureId;
  title: string;
  description: string;
  available: boolean;
}

export const PLUS_FEATURES: PlusFeature[] = [
  {
    id: 'unlimitedAssistant',
    title: 'Απεριόριστος βοηθός',
    description: `Ρώτα όσο θέλεις. Στη δωρεάν έκδοση έχεις ${FREE_ASSISTANT_QUESTIONS_PER_MONTH} ερωτήσεις τον μήνα.`,
    available: true,
  },
  {
    id: 'familyProfiles',
    title: 'Οικογενειακό προφίλ',
    description: 'Παροχές και προθεσμίες για σύντροφο, παιδιά ή γονείς, σε ένα σημείο.',
    available: false,
  },
  {
    id: 'smartReminders',
    title: 'Έξυπνες υπενθυμίσεις',
    description: 'Πολλές υπενθυμίσεις ανά προθεσμία και συγχρονισμός με το ημερολόγιό σου.',
    available: false,
  },
  {
    id: 'newProgramAlerts',
    title: 'Ειδοποίηση για νέα προγράμματα',
    description: 'Μαθαίνεις πρώτος/η όταν ανοίγει πρόγραμμα που ταιριάζει στα στοιχεία σου.',
    available: false,
  },
  {
    id: 'weeklyDigest',
    title: 'Εβδομαδιαία σύνοψη',
    description: 'Κάθε εβδομάδα, τι αλλάζει για σένα και τι πρέπει να κάνεις.',
    available: false,
  },
];

export const ALWAYS_FREE = [
  'Παροχές που μπορεί να σε αφορούν',
  'Έλεγχος επιλεξιμότητας',
  'Όλες οι διαδικασίες και τα βήματα',
  'Επίσημες πηγές',
  'Εργασίες και βασικές υπενθυμίσεις',
];

export function currentMonthKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
