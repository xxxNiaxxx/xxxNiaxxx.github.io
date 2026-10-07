import { useMemo } from 'react';
import { evaluateBenefit, recommendBenefits } from '@/lib/eligibility';
import { useProfileStore } from '@/store/profileStore';
import type { EligibilityStatus } from '@/types/models';
import { useBenefits } from './useContent';

/** Benefits that may concern the user, ranked by the deterministic engine. */
export function useRecommendations() {
  const profile = useProfileStore((s) => s.profile);
  const query = useBenefits();
  const recommendations = useMemo(() => (query.data ? recommendBenefits(query.data, profile) : []), [query.data, profile]);
  return { ...query, recommendations };
}

/** Status lookup for any list of benefits. */
export function useEligibilityMap(): Record<string, EligibilityStatus> {
  const profile = useProfileStore((s) => s.profile);
  const { data } = useBenefits();
  return useMemo(() => {
    const map: Record<string, EligibilityStatus> = {};
    (data ?? []).forEach((b) => (map[b.id] = evaluateBenefit(b, profile).status));
    return map;
  }, [data, profile]);
}
