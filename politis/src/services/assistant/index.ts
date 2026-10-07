import type { AssistantContext, AssistantResponse } from '@/types/models';
import { analytics } from '@/lib/analytics';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { contentService } from '../contentService';
import { mockAssistantProvider } from './mockProvider';
import { remoteAssistantProvider } from './remoteProvider';
import type { AssistantProvider } from './types';

function selectProvider(): AssistantProvider {
  return env.assistantMode === 'remote' && env.isSupabaseConfigured ? remoteAssistantProvider : mockAssistantProvider;
}

export const assistantService = {
  get mode(): AssistantProvider['name'] {
    return selectProvider().name;
  },

  /** assistantService.ask(message, context) → structured AssistantResponse. */
  async ask(message: string, context: AssistantContext): Promise<AssistantResponse> {
    const provider = selectProvider();
    analytics.track('assistant_question', { mode: provider.name });
    const [benefits, procedures] = await Promise.all([contentService.getBenefits(), contentService.getProcedures()]);
    const catalog = { benefits, procedures };
    try {
      return await provider.ask(message, context, catalog);
    } catch (error) {
      if (provider.name === 'mock') throw error;
      // Remote failed: degrade gracefully to deterministic answers.
      logger.error('assistant.remote', error);
      return mockAssistantProvider.ask(message, context, catalog);
    }
  },
};

export type { AssistantProvider } from './types';
