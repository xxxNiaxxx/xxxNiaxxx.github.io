/**
 * Content (benefits & procedures) repository.
 * - With Supabase configured: reads the public `benefits` / `procedures` tables.
 * - Otherwise (or when the tables are empty): serves clearly-labelled MOCK data.
 */
import type { Benefit, BenefitRule, Procedure, ProcedureStep, Source } from '@/types/models';
import { buildMockBenefits, buildMockProcedures } from '@/data/mock';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const MOCK_LATENCY_MS = 350;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

let mockBenefits: Benefit[] | null = null;
let mockProcedures: Procedure[] | null = null;
const getMockBenefits = () => (mockBenefits ??= buildMockBenefits());
const getMockProcedures = () => (mockProcedures ??= buildMockProcedures());

// ---- Row types (snake_case, as stored in Postgres) ----
interface SourceRow { id: string; authority: string; url: string; last_verified: string; is_mock: boolean }
interface RuleRow { id: string; field: BenefitRule['field']; operator: BenefitRule['operator']; value: BenefitRule['value']; required: boolean; description: string }
interface BenefitRow {
  id: string; title: string; summary: string; description: string; category: Benefit['category'];
  authority: string; official_url: string; last_verified: string; status: Benefit['status'];
  deadline: string | null; procedure_id: string | null; required_checks: string[] | null; keywords: string[] | null;
  is_mock: boolean; sources: SourceRow | null; benefit_rules: RuleRow[] | null;
}
interface StepRow { id: string; step_order: number; title: string; description: string | null }
interface ProcedureRow {
  id: string; title: string; action_title: string; description: string; category: Procedure['category'];
  authority: string; official_url: string; estimated_time: string; cost: string; required_documents: string[] | null;
  online: boolean; keywords: string[] | null; is_mock: boolean; sources: SourceRow | null; procedure_steps: StepRow[] | null;
}

function mapSource(row: SourceRow | null, fallback: { id: string; authority: string; url: string; lastVerified: string; isMock: boolean }): Source {
  if (!row) return { id: `src_${fallback.id}`, authority: fallback.authority, url: fallback.url, lastVerified: fallback.lastVerified, isMock: fallback.isMock };
  return { id: row.id, authority: row.authority, url: row.url, lastVerified: row.last_verified, isMock: row.is_mock };
}

function mapBenefit(row: BenefitRow): Benefit {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    description: row.description,
    category: row.category,
    authority: row.authority,
    officialUrl: row.official_url,
    lastVerified: row.last_verified,
    status: row.status,
    deadline: row.deadline ?? undefined,
    procedureId: row.procedure_id ?? undefined,
    requiredChecks: row.required_checks ?? [],
    keywords: row.keywords ?? [],
    isMock: row.is_mock,
    eligibilityRules: (row.benefit_rules ?? []).map((r) => ({ ...r })),
    source: mapSource(row.sources, { id: row.id, authority: row.authority, url: row.official_url, lastVerified: row.last_verified, isMock: row.is_mock }),
  };
}

function mapProcedure(row: ProcedureRow): Procedure {
  const steps: ProcedureStep[] = (row.procedure_steps ?? [])
    .slice()
    .sort((a, b) => a.step_order - b.step_order)
    .map((s) => ({ id: s.id, order: s.step_order, title: s.title, description: s.description ?? undefined }));
  return {
    id: row.id,
    title: row.title,
    actionTitle: row.action_title,
    description: row.description,
    category: row.category,
    authority: row.authority,
    officialUrl: row.official_url,
    estimatedTime: row.estimated_time,
    cost: row.cost,
    requiredDocuments: row.required_documents ?? [],
    steps,
    online: row.online,
    keywords: row.keywords ?? [],
    isMock: row.is_mock,
    source: mapSource(row.sources, { id: row.id, authority: row.authority, url: row.official_url, lastVerified: '', isMock: row.is_mock }),
  };
}

async function fetchRemoteBenefits(): Promise<Benefit[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('benefits').select('*, sources(*), benefit_rules(*)');
  if (error) throw error;
  if (!data || data.length === 0) {
    logger.info('content', 'No remote benefits found — falling back to mock data');
    return null;
  }
  return (data as BenefitRow[]).map(mapBenefit);
}

async function fetchRemoteProcedures(): Promise<Procedure[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('procedures').select('*, sources(*), procedure_steps(*)');
  if (error) throw error;
  if (!data || data.length === 0) {
    logger.info('content', 'No remote procedures found — falling back to mock data');
    return null;
  }
  return (data as ProcedureRow[]).map(mapProcedure);
}

export const contentService = {
  async getBenefits(): Promise<Benefit[]> {
    const remote = await fetchRemoteBenefits();
    if (remote) return remote;
    await wait(MOCK_LATENCY_MS);
    return getMockBenefits();
  },
  async getBenefit(id: string): Promise<Benefit | null> {
    const all = await contentService.getBenefits();
    return all.find((b) => b.id === id) ?? null;
  },
  async getProcedures(): Promise<Procedure[]> {
    const remote = await fetchRemoteProcedures();
    if (remote) return remote;
    await wait(MOCK_LATENCY_MS);
    return getMockProcedures();
  },
  async getProcedure(id: string): Promise<Procedure | null> {
    const all = await contentService.getProcedures();
    return all.find((p) => p.id === id) ?? null;
  },
};
