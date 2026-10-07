import type { AssistantContext, AssistantResponse, Benefit, Procedure } from '@/types/models';

export interface AssistantCatalog {
  benefits: Benefit[];
  procedures: Procedure[];
}

/** A pluggable assistant backend. UI components never talk to a provider directly. */
export interface AssistantProvider {
  readonly name: 'mock' | 'remote';
  ask(message: string, context: AssistantContext, catalog: AssistantCatalog): Promise<AssistantResponse>;
}
