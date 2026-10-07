import type { AssistantResponse, Source } from '@/types/models';
import { evaluateBenefit } from '@/lib/eligibility';
import type { AssistantCatalog } from './types';
import type { AssistantContext } from '@/types/models';

/**
 * Turns ids chosen by a provider into a structured response.
 * Eligibility is ALWAYS recomputed here with the deterministic engine — providers (incl. an LLM)
 * can only suggest which items are relevant, never whether the user is eligible.
 */
export function buildResponse(
  answer: string,
  benefitIds: string[],
  procedureIds: string[],
  context: AssistantContext,
  catalog: AssistantCatalog,
  isMock: boolean,
): AssistantResponse {
  const benefits = benefitIds
    .map((id) => catalog.benefits.find((b) => b.id === id))
    .filter((b): b is NonNullable<typeof b> => Boolean(b))
    .slice(0, 4);
  const procedures = procedureIds
    .map((id) => catalog.procedures.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, 3);

  const sources = new Map<string, Source>();
  [...benefits, ...procedures].forEach((x) => sources.set(x.source.id, x.source));

  return {
    answer,
    recommendations: benefits.map((b) => ({
      benefitId: b.id,
      title: b.title,
      eligibility: evaluateBenefit(b, context.profile).status,
    })),
    procedures: procedures.map((p) => ({ procedureId: p.id, title: p.title })),
    sources: Array.from(sources.values()),
    isMock,
  };
}
