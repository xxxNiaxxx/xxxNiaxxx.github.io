/**
 * Core domain models for Politis.
 * Field names are English; all user-facing strings live in the UI / data layers in Greek.
 */

export type AgeRange = '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';

export type EmploymentStatus =
  | 'employed'
  | 'self_employed'
  | 'unemployed'
  | 'student'
  | 'retired'
  | 'other';

export type HousingStatus = 'renter' | 'owner' | 'family' | 'other';

export type IncomeRange = 'low' | 'lower_middle' | 'middle' | 'high';

/** 0, 1, 2 or 3 (meaning "3 or more"). */
export type ChildrenCount = 0 | 1 | 2 | 3;

export type RegionId =
  | 'attica'
  | 'central_macedonia'
  | 'east_macedonia_thrace'
  | 'west_macedonia'
  | 'epirus'
  | 'thessaly'
  | 'central_greece'
  | 'ionian_islands'
  | 'western_greece'
  | 'peloponnese'
  | 'north_aegean'
  | 'south_aegean'
  | 'crete';

/**
 * The user's profile. Deliberately contains NO government identifiers
 * (no ΑΦΜ, ΑΜΚΑ, Taxisnet or banking credentials).
 */
export interface UserProfile {
  id: string;
  firstName?: string;
  ageRange?: AgeRange;
  employmentStatus?: EmploymentStatus;
  children?: ChildrenCount;
  housingStatus?: HousingStatus;
  region?: RegionId;
  municipality?: string;
  incomeRange?: IncomeRange;
  onboardingCompleted: boolean;
  updatedAt: string;
}

export type ProfileField =
  | 'ageRange'
  | 'employmentStatus'
  | 'children'
  | 'housingStatus'
  | 'region'
  | 'incomeRange';

export type Category =
  | 'family'
  | 'work'
  | 'unemployment'
  | 'housing'
  | 'education'
  | 'vehicle'
  | 'tax'
  | 'health';

export interface Source {
  id: string;
  authority: string;
  url: string;
  lastVerified: string; // ISO date
  /** True for demo/placeholder sources. Mock URLs are never opened as if they were official. */
  isMock: boolean;
}

export type RuleOperator = 'in' | 'notIn' | 'gte' | 'lte' | 'eq';

export interface BenefitRule {
  id: string;
  field: ProfileField;
  operator: RuleOperator;
  value: string | number | (string | number)[];
  /** A failed required rule makes the result UNLIKELY. Non-required rules only add context. */
  required: boolean;
  /** Short Greek explanation shown to the user, e.g. «Έχεις τουλάχιστον ένα παιδί». */
  description: string;
}

export type BenefitStatus = 'open' | 'upcoming' | 'closed';

export interface Benefit {
  id: string;
  title: string;
  summary: string;
  description: string;
  category: Category;
  authority: string;
  officialUrl: string;
  lastVerified: string;
  status: BenefitStatus;
  deadline?: string;
  eligibilityRules: BenefitRule[];
  /** Things the user must still verify themselves (shown as «Απαιτούμενοι έλεγχοι»). */
  requiredChecks: string[];
  procedureId?: string;
  source: Source;
  keywords: string[];
  isMock: boolean;
}

export interface ProcedureStep {
  id: string;
  order: number;
  title: string;
  description?: string;
}

export interface Procedure {
  id: string;
  title: string;
  /** Used in «Πώς κάνω [actionTitle];» */
  actionTitle: string;
  description: string;
  category: Category;
  authority: string;
  officialUrl: string;
  estimatedTime: string;
  cost: string;
  requiredDocuments: string[];
  steps: ProcedureStep[];
  online: boolean;
  source: Source;
  keywords: string[];
  isMock: boolean;
}

export type TaskStatus = 'pending' | 'done';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string; // ISO
  status: TaskStatus;
  procedureId?: string;
  benefitId?: string;
  remindAt?: string; // ISO
  notificationId?: string | null;
  createdAt: string;
  completedAt?: string;
  isMock?: boolean;
}

export type Urgency = 'overdue' | 'high' | 'medium' | 'low' | 'none';

export interface Deadline {
  id: string;
  title: string;
  date: string;
  kind: 'task' | 'benefit';
  taskId?: string;
  benefitId?: string;
}

export type EligibilityStatus = 'LIKELY_ELIGIBLE' | 'NEEDS_MORE_INFO' | 'UNLIKELY' | 'UNKNOWN';

export interface RuleOutcome {
  rule: BenefitRule;
  outcome: 'pass' | 'fail' | 'missing';
}

export interface EligibilityResult {
  benefitId: string;
  status: EligibilityStatus;
  outcomes: RuleOutcome[];
  missingFields: ProfileField[];
  evaluatedAt: string;
}

export interface AssistantRecommendation {
  benefitId: string;
  title: string;
  /** Always computed by the deterministic eligibility engine — never by the LLM. */
  eligibility: EligibilityStatus;
}

export interface AssistantProcedureRef {
  procedureId: string;
  title: string;
}

export interface AssistantResponse {
  answer: string;
  recommendations: AssistantRecommendation[];
  procedures: AssistantProcedureRef[];
  sources: Source[];
  /** True when the answer came from the deterministic mock provider. */
  isMock: boolean;
}

export interface AssistantContext {
  profile: UserProfile | null;
  pendingTasks: Pick<Task, 'title' | 'dueDate'>[];
}

export interface InAppNotification {
  id: string;
  /** Dedupe key so the same reminder isn't added twice. */
  key?: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  taskId?: string;
  benefitId?: string;
}
