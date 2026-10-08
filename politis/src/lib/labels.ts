import type {
  AgeRange,
  BenefitStatus,
  Category,
  ChildrenCount,
  EligibilityStatus,
  EmploymentStatus,
  HousingStatus,
  IncomeRange,
  ProfileField,
  RegionId,
} from '@/types/models';
import type { Tone } from '@/theme';

/** Greek labels for every enum shown in the UI. */

export const ageRangeLabels: Record<AgeRange, string> = {
  '18-24': '18–24',
  '25-34': '25–34',
  '35-44': '35–44',
  '45-54': '45–54',
  '55-64': '55–64',
  '65+': '65 και άνω',
};

export const employmentLabels: Record<EmploymentStatus, string> = {
  employed: 'Μισθωτός/ή',
  self_employed: 'Ελεύθερος/η επαγγελματίας',
  unemployed: 'Άνεργος/η',
  student: 'Φοιτητής/τρια',
  retired: 'Συνταξιούχος',
  other: 'Άλλο',
};

export const housingLabels: Record<HousingStatus, string> = {
  renter: 'Ενοικιάζω',
  owner: 'Ιδιόκτητη κατοικία',
  family: 'Μένω με την οικογένεια',
  other: 'Άλλο',
};

export const incomeLabels: Record<IncomeRange, string> = {
  low: 'Έως 10.000 € τον χρόνο',
  lower_middle: '10.001 – 20.000 €',
  middle: '20.001 – 40.000 €',
  high: 'Πάνω από 40.000 €',
};

export const childrenLabels: Record<ChildrenCount, string> = {
  0: 'Κανένα',
  1: '1 παιδί',
  2: '2 παιδιά',
  3: '3 ή περισσότερα',
};

export const regionLabels: Record<RegionId, string> = {
  attica: 'Αττική',
  central_macedonia: 'Κεντρική Μακεδονία',
  east_macedonia_thrace: 'Ανατολική Μακεδονία και Θράκη',
  west_macedonia: 'Δυτική Μακεδονία',
  epirus: 'Ήπειρος',
  thessaly: 'Θεσσαλία',
  central_greece: 'Στερεά Ελλάδα',
  ionian_islands: 'Ιόνια Νησιά',
  western_greece: 'Δυτική Ελλάδα',
  peloponnese: 'Πελοπόννησος',
  north_aegean: 'Βόρειο Αιγαίο',
  south_aegean: 'Νότιο Αιγαίο',
  crete: 'Κρήτη',
};

export const categoryLabels: Record<Category, string> = {
  family: 'Οικογένεια',
  work: 'Εργασία',
  unemployment: 'Ανεργία',
  housing: 'Στέγαση',
  education: 'Εκπαίδευση',
  vehicle: 'Αυτοκίνητο',
  tax: 'Φορολογία',
  health: 'Υγεία',
};

export const benefitStatusLabels: Record<BenefitStatus, string> = {
  open: 'Ανοιχτό',
  upcoming: 'Αναμένεται',
  closed: 'Κλειστό',
};

export const profileFieldLabels: Record<ProfileField, string> = {
  ageRange: 'Ηλικία',
  employmentStatus: 'Εργασιακή κατάσταση',
  children: 'Αριθμός παιδιών',
  housingStatus: 'Κατοικία',
  region: 'Περιοχή',
  incomeRange: 'Εισόδημα',
};

export interface EligibilityPresentation {
  label: string;
  shortLabel: string;
  tone: Tone;
  /** Emoji/symbol so status never relies on color alone. */
  symbol: string;
  resultMessage: string;
}

export const eligibilityPresentation: Record<EligibilityStatus, EligibilityPresentation> = {
  LIKELY_ELIGIBLE: {
    label: 'Πιθανόν να σε αφορά',
    shortLabel: 'Πιθανόν να σε αφορά',
    tone: 'success',
    symbol: '🟢',
    resultMessage: 'Φαίνεται ότι πληροίς τα βασικά κριτήρια.',
  },
  NEEDS_MORE_INFO: {
    label: 'Χρειάζεται έλεγχος',
    shortLabel: 'Χρειάζεται έλεγχος',
    tone: 'warning',
    symbol: '🟡',
    resultMessage: 'Χρειαζόμαστε μερικές ακόμη πληροφορίες για να σου πούμε περισσότερα.',
  },
  UNLIKELY: {
    label: 'Δεν φαίνεται να πληροίς τα βασικά κριτήρια',
    shortLabel: 'Μάλλον δεν σε αφορά',
    tone: 'danger',
    symbol: '🔴',
    resultMessage: 'Με βάση τις απαντήσεις σου, δεν φαίνεται να πληροίς τα βασικά κριτήρια.',
  },
  UNKNOWN: {
    label: 'Χρειάζεται έλεγχος',
    shortLabel: 'Άγνωστο',
    tone: 'neutral',
    symbol: '⚪',
    resultMessage: 'Δεν μπορούμε να εκτιμήσουμε την επιλεξιμότητα για αυτό το πρόγραμμα. Δες την επίσημη πηγή.',
  },
};

/** Why we store each profile field — shown in the Privacy Center. */
export const profileFieldPurposes: Record<ProfileField | 'firstName', string> = {
  firstName: 'Χρησιμοποιείται μόνο για να σε χαιρετάμε στην αρχική οθόνη.',
  ageRange: 'Χρησιμοποιείται για να βρούμε παροχές που αφορούν την ηλικιακή σου ομάδα.',
  employmentStatus: 'Χρησιμοποιείται για εξατομίκευση παροχών εργασίας και ανεργίας.',
  children: 'Χρησιμοποιείται για εξατομίκευση παροχών.',
  housingStatus: 'Χρησιμοποιείται για προγράμματα στέγασης και ενοικίου.',
  region: 'Χρησιμοποιείται για τοπικά προγράμματα και υπηρεσίες της περιοχής σου.',
  incomeRange: 'Χρησιμοποιείται μόνο στον έλεγχο επιλεξιμότητας. Δεν ζητάμε ποτέ ακριβή ποσά.',
};
