/**
 * Remote assistant provider: calls the Supabase Edge Function `assistant`.
 * The LLM API key lives ONLY in the Edge Function's secrets — never in the app.
 *
 * Privacy: we do not send the raw profile. We send the question, a compact catalog
 * (ids + titles) and the deterministic eligibility status per benefit.
 */
import { supabase } from '@/lib/supabase';
import { evaluateBenefit } from '@/lib/eligibility';
import type { AssistantProvider } from './types';
import { buildResponse } from './buildResponse';

interface RemotePayload {
  answer: string;
  benefitIds: string[];
  procedureIds: string[];
}

function isRemotePayload(x: unknown): x is RemotePayload {
  const o = x as RemotePayload | null;
  return !!o && typeof o.answer === 'string' && Array.isArray(o.benefitIds) && Array.isArray(o.procedureIds);
}

export const remoteAssistantProvider: AssistantProvider = {
  name: 'remote',
  async ask(message, context, catalog) {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.functions.invoke('assistant', {
      body: {
        message,
        catalog: {
          benefits: catalog.benefits
            .filter((b) => b.status !== 'closed')
            .map((b) => ({ id: b.id, title: b.title, summary: b.summary, eligibility: evaluateBenefit(b, context.profile).status })),
          procedures: catalog.procedures.map((p) => ({ id: p.id, title: p.title })),
        },
        pendingTasks: context.pendingTasks.slice(0, 10),
      },
    });
    if (error) throw error;
    if (!isRemotePayload(data)) throw new Error('Invalid assistant payload');
    return buildResponse(data.answer, data.benefitIds, data.procedureIds, context, catalog, false);
  },
};
