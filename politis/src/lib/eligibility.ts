/**
 * Deterministic eligibility engine.
 *
 * IMPORTANT: Eligibility is ALWAYS computed here from explicit rules.
 * The AI assistant must never determine eligibility on its own.
 * Results are informational — the final decision belongs to the competent authority.
 */
import type {
  Benefit,
  BenefitRule,
  EligibilityResult,
  EligibilityStatus,
  ProfileField,
  RuleOutcome,
  UserProfile,
} from '@/types/models';

type ProfileValue = string | number | undefined;

export function getProfileValue(profile: Partial<UserProfile> | null | undefined, field: ProfileField): ProfileValue {
  if (!profile) return undefined;
  return profile[field];
}

/** Ordinal scales so `gte` / `lte` work on ranges as well as numbers. */
const ORDINALS: Partial<Record<ProfileField, readonly (string | number)[]>> = {
  ageRange: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
  incomeRange: ['low', 'lower_middle', 'middle', 'high'],
  children: [0, 1, 2, 3],
};

function toComparable(field: ProfileField, value: string | number): number {
  const scale = ORDINALS[field];
  if (scale) {
    const idx = scale.indexOf(value);
    if (idx >= 0) return idx;
  }
  return typeof value === 'number' ? value : Number.NaN;
}

export function evaluateRule(rule: BenefitRule, value: ProfileValue): RuleOutcome['outcome'] {
  if (value === undefined || value === null || value === '') return 'missing';
  const expected = rule.value;
  switch (rule.operator) {
    case 'eq':
      return value === expected ? 'pass' : 'fail';
    case 'in':
      return Array.isArray(expected) && expected.includes(value) ? 'pass' : 'fail';
    case 'notIn':
      return Array.isArray(expected) && !expected.includes(value) ? 'pass' : 'fail';
    case 'gte':
    case 'lte': {
      if (Array.isArray(expected)) return 'fail';
      const a = toComparable(rule.field, value);
      const b = toComparable(rule.field, expected);
      if (Number.isNaN(a) || Number.isNaN(b)) return 'fail';
      return rule.operator === 'gte' ? (a >= b ? 'pass' : 'fail') : a <= b ? 'pass' : 'fail';
    }
    default:
      return 'fail';
  }
}

export function evaluateBenefit(benefit: Benefit, profile: Partial<UserProfile> | null): EligibilityResult {
  const outcomes: RuleOutcome[] = benefit.eligibilityRules.map((rule) => ({
    rule,
    outcome: evaluateRule(rule, getProfileValue(profile, rule.field)),
  }));

  const missingFields = Array.from(
    new Set(outcomes.filter((o) => o.outcome === 'missing').map((o) => o.rule.field)),
  );

  let status: EligibilityStatus;
  if (outcomes.length === 0) {
    status = 'UNKNOWN';
  } else if (outcomes.some((o) => o.rule.required && o.outcome === 'fail')) {
    status = 'UNLIKELY';
  } else if (outcomes.some((o) => o.rule.required && o.outcome === 'missing')) {
    status = 'NEEDS_MORE_INFO';
  } else {
    status = 'LIKELY_ELIGIBLE';
  }

  return { benefitId: benefit.id, status, outcomes, missingFields, evaluatedAt: new Date().toISOString() };
}

const STATUS_RANK: Record<EligibilityStatus, number> = {
  LIKELY_ELIGIBLE: 0,
  NEEDS_MORE_INFO: 1,
  UNKNOWN: 2,
  UNLIKELY: 3,
};

/** Benefits that may concern the user, best matches first. Excludes UNLIKELY and closed programs. */
export function recommendBenefits(
  benefits: Benefit[],
  profile: Partial<UserProfile> | null,
): { benefit: Benefit; result: EligibilityResult }[] {
  return benefits
    .filter((b) => b.status !== 'closed')
    .map((benefit) => ({ benefit, result: evaluateBenefit(benefit, profile) }))
    .filter(({ result }) => result.status === 'LIKELY_ELIGIBLE' || result.status === 'NEEDS_MORE_INFO')
    .sort((a, b) => {
      const rank = STATUS_RANK[a.result.status] - STATUS_RANK[b.result.status];
      if (rank !== 0) return rank;
      // More matched rules = more specific match.
      const passes = (r: EligibilityResult) => r.outcomes.filter((o) => o.outcome === 'pass').length;
      return passes(b.result) - passes(a.result);
    });
}

/** Profile fields the eligibility questionnaire should ask for this benefit, in display order. */
export function questionFieldsFor(benefit: Benefit): ProfileField[] {
  const order: ProfileField[] = ['employmentStatus', 'children', 'housingStatus', 'incomeRange', 'ageRange', 'region'];
  const used = new Set(benefit.eligibilityRules.map((r) => r.field));
  return order.filter((f) => used.has(f));
}
