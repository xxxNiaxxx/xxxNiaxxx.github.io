import type { ProfileField, UserProfile } from '@/types/models';
import {
  ageRangeLabels,
  childrenLabels,
  employmentLabels,
  housingLabels,
  incomeLabels,
  regionLabels,
} from './labels';

export interface QuestionOption {
  value: string | number;
  label: string;
  emoji?: string;
}

export interface ProfileQuestion {
  field: ProfileField;
  title: string;
  /** Question used inside the eligibility check. */
  checkTitle: string;
  options: QuestionOption[];
}

function fromLabels<T extends string | number>(labels: Record<T, string>, emojis?: Partial<Record<T, string>>, numeric = false): QuestionOption[] {
  return (Object.keys(labels) as T[]).map((k) => ({
    value: numeric ? Number(k) : k,
    label: labels[k],
    emoji: emojis?.[k],
  }));
}

export const profileQuestions: Record<ProfileField, ProfileQuestion> = {
  ageRange: {
    field: 'ageRange',
    title: 'Πόσο χρονών είσαι;',
    checkTitle: 'Σε ποια ηλικιακή ομάδα ανήκεις;',
    options: fromLabels(ageRangeLabels),
  },
  employmentStatus: {
    field: 'employmentStatus',
    title: 'Ποια είναι η εργασιακή σου κατάσταση;',
    checkTitle: 'Ποια είναι η εργασιακή σου κατάσταση σήμερα;',
    options: fromLabels(employmentLabels, { employed: '💼', self_employed: '🧑‍💻', unemployed: '🔎', student: '🎓', retired: '🌿', other: '✳️' }),
  },
  children: {
    field: 'children',
    title: 'Έχεις παιδιά;',
    checkTitle: 'Πόσα εξαρτώμενα παιδιά έχεις;',
    options: fromLabels(childrenLabels, { 0: '—', 1: '👶', 2: '👧👦', 3: '👨‍👩‍👧‍👦' }, true),
  },
  housingStatus: {
    field: 'housingStatus',
    title: 'Πού μένεις;',
    checkTitle: 'Ποια είναι η κατάσταση κατοικίας σου;',
    options: fromLabels(housingLabels, { renter: '🔑', owner: '🏠', family: '👪', other: '✳️' }),
  },
  region: {
    field: 'region',
    title: 'Σε ποια περιοχή μένεις;',
    checkTitle: 'Σε ποια περιφέρεια μένεις;',
    options: fromLabels(regionLabels),
  },
  incomeRange: {
    field: 'incomeRange',
    title: 'Ποιο είναι περίπου το ετήσιο εισόδημα του νοικοκυριού σου;',
    checkTitle: 'Ποιο είναι περίπου το ετήσιο οικογενειακό εισόδημα;',
    options: fromLabels(incomeLabels),
  },
};

export function displayValue(profile: UserProfile | null, field: ProfileField): string | null {
  const value = profile?.[field];
  if (value === undefined || value === null) return null;
  return profileQuestions[field].options.find((o) => o.value === value)?.label ?? null;
}
