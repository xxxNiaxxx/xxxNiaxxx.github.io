/**
 * Shared definition of the content workbook (template + importer).
 * Column headers are Greek for the editor; keys are the internal field names.
 */
import {
  ageRangeLabels,
  benefitStatusLabels,
  categoryLabels,
  childrenLabels,
  employmentLabels,
  housingLabels,
  incomeLabels,
  profileFieldLabels,
  regionLabels,
} from '../../src/lib/labels.ts';
import type { ProfileField, RuleOperator } from '../../src/types/models.ts';

export const DEFAULT_WORKBOOK = 'content/politis-content.xlsx';
export const EXAMPLE_PREFIX = 'example-';

export const SHEETS = {
  guide: 'Οδηγίες',
  benefits: 'Παροχές',
  rules: 'Κριτήρια',
  procedures: 'Διαδικασίες',
  steps: 'Βήματα',
  lists: 'Επιτρεπόμενες τιμές',
} as const;

export interface Column {
  key: string;
  header: string;
  width: number;
  required?: boolean;
  /** Name of a list in LISTS: the template adds a dropdown. */
  list?: keyof typeof LISTS;
  note?: string;
}

const YES_NO = ['Ναι', 'Όχι'];

export const OPERATOR_LABELS: Record<RuleOperator, string> = {
  in: 'είναι ένα από',
  notIn: 'δεν είναι κανένα από',
  gte: 'τουλάχιστον',
  lte: 'το πολύ',
  eq: 'ίσο με',
};

/** Allowed values per profile field, as Greek label → stored value. */
export const FIELD_VALUES: Record<ProfileField, Record<string, string | number>> = {
  ageRange: invert(ageRangeLabels),
  employmentStatus: invert(employmentLabels),
  children: Object.fromEntries(Object.entries(childrenLabels).map(([k, v]) => [v, Number(k)])),
  housingStatus: invert(housingLabels),
  region: invert(regionLabels),
  incomeRange: invert(incomeLabels),
};

function invert<T extends string>(labels: Record<T, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(labels).map(([k, v]) => [v as string, k]));
}

export const LISTS = {
  category: Object.values(categoryLabels),
  status: Object.values(benefitStatusLabels),
  field: Object.values(profileFieldLabels),
  operator: Object.values(OPERATOR_LABELS),
  yesNo: YES_NO,
} as const;

export const BENEFIT_COLUMNS: Column[] = [
  { key: 'id', header: 'Κωδικός', width: 26, required: true, note: 'Μοναδικός κωδικός με λατινικά, π.χ. epidoma-paidiou. Δεν αλλάζει μετά τη δημοσίευση.' },
  { key: 'title', header: 'Τίτλος', width: 34, required: true },
  { key: 'summary', header: 'Σύντομη περιγραφή', width: 40, required: true, note: 'Μία πρόταση για τις κάρτες.' },
  { key: 'description', header: 'Περιγραφή', width: 60, required: true },
  { key: 'category', header: 'Κατηγορία', width: 16, required: true, list: 'category' },
  { key: 'authority', header: 'Αρμόδιος φορέας', width: 28, required: true },
  { key: 'officialUrl', header: 'Επίσημος σύνδεσμος', width: 40, required: true, note: 'Η επίσημη σελίδα του προγράμματος (https://...).' },
  { key: 'lastVerified', header: 'Ημερομηνία επιβεβαίωσης', width: 18, required: true, note: 'Πότε ελέγξατε τα στοιχεία στην επίσημη πηγή (ηη/μμ/εεεε).' },
  { key: 'status', header: 'Κατάσταση', width: 14, required: true, list: 'status' },
  { key: 'deadline', header: 'Προθεσμία', width: 16, note: 'Τελευταία ημέρα αιτήσεων (ηη/μμ/εεεε), αν υπάρχει.' },
  { key: 'procedureId', header: 'Διαδικασία αίτησης (κωδικός)', width: 26, note: 'Ο κωδικός από το φύλλο «Διαδικασίες».' },
  { key: 'requiredChecks', header: 'Απαιτούμενοι έλεγχοι', width: 44, note: 'Ένας έλεγχος ανά γραμμή (Alt+Enter στο Excel).' },
  { key: 'keywords', header: 'Λέξεις-κλειδιά', width: 30, note: 'Χωρισμένες με κόμμα, για την αναζήτηση.' },
];

export const RULE_COLUMNS: Column[] = [
  { key: 'benefitId', header: 'Παροχή (κωδικός)', width: 26, required: true },
  { key: 'field', header: 'Στοιχείο χρήστη', width: 22, required: true, list: 'field' },
  { key: 'operator', header: 'Συνθήκη', width: 22, required: true, list: 'operator' },
  { key: 'value', header: 'Τιμή', width: 44, required: true, note: 'Από το φύλλο «Επιτρεπόμενες τιμές». Για «είναι ένα από» γράψτε πολλές τιμές χωρισμένες με κόμμα.' },
  { key: 'required', header: 'Υποχρεωτικό', width: 14, required: true, list: 'yesNo', note: 'Ναι = αν δεν ισχύει, η παροχή μάλλον δεν αφορά τον χρήστη.' },
  { key: 'description', header: 'Περιγραφή για τον χρήστη', width: 44, required: true, note: 'Π.χ. «Έχεις τουλάχιστον ένα παιδί».' },
];

export const PROCEDURE_COLUMNS: Column[] = [
  { key: 'id', header: 'Κωδικός', width: 26, required: true },
  { key: 'title', header: 'Τίτλος', width: 34, required: true },
  { key: 'actionTitle', header: 'Πώς κάνω …;', width: 34, required: true, note: 'Συμπληρώνει τη φράση «Πώς κάνω …;», π.χ. «αλλαγή διεύθυνσης».' },
  { key: 'description', header: 'Περιγραφή', width: 60, required: true },
  { key: 'category', header: 'Κατηγορία', width: 16, required: true, list: 'category' },
  { key: 'authority', header: 'Αρμόδιος φορέας', width: 28, required: true },
  { key: 'officialUrl', header: 'Επίσημη υπηρεσία', width: 40, required: true },
  { key: 'lastVerified', header: 'Ημερομηνία επιβεβαίωσης', width: 18, required: true },
  { key: 'estimatedTime', header: 'Εκτιμώμενος χρόνος', width: 18, required: true },
  { key: 'cost', header: 'Κόστος', width: 26, required: true },
  { key: 'online', header: 'Ηλεκτρονικά', width: 12, required: true, list: 'yesNo' },
  { key: 'requiredDocuments', header: 'Δικαιολογητικά', width: 44, note: 'Ένα ανά γραμμή (Alt+Enter στο Excel).' },
  { key: 'keywords', header: 'Λέξεις-κλειδιά', width: 30 },
];

export const STEP_COLUMNS: Column[] = [
  { key: 'procedureId', header: 'Διαδικασία (κωδικός)', width: 26, required: true },
  { key: 'order', header: 'Σειρά', width: 8, required: true },
  { key: 'title', header: 'Βήμα', width: 44, required: true },
  { key: 'description', header: 'Λεπτομέρειες', width: 60 },
];
