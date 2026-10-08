import { useQuery } from '@tanstack/react-query';
import { contentService } from '@/services/contentService';

export const contentKeys = {
  benefits: ['benefits'] as const,
  procedures: ['procedures'] as const,
};

export function useBenefits() {
  return useQuery({ queryKey: contentKeys.benefits, queryFn: contentService.getBenefits });
}

export function useBenefit(id: string | undefined) {
  const query = useBenefits();
  return { ...query, data: id ? query.data?.find((b) => b.id === id) ?? null : null };
}

export function useProcedures() {
  return useQuery({ queryKey: contentKeys.procedures, queryFn: contentService.getProcedures });
}

export function useProcedure(id: string | undefined) {
  const query = useProcedures();
  return { ...query, data: id ? query.data?.find((p) => p.id === id) ?? null : null };
}
