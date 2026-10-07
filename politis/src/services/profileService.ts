import type { UserProfile } from '@/types/models';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { useAppStore } from '@/store/appStore';
import { useProfileStore } from '@/store/profileStore';

interface ProfileRow {
  id: string;
  first_name: string | null;
  age_range: UserProfile['ageRange'] | null;
  employment_status: UserProfile['employmentStatus'] | null;
  children: UserProfile['children'] | null;
  housing_status: UserProfile['housingStatus'] | null;
  region: UserProfile['region'] | null;
  municipality: string | null;
  income_range: UserProfile['incomeRange'] | null;
  onboarding_completed: boolean;
  updated_at: string;
}

function toRow(p: UserProfile): ProfileRow {
  return {
    id: p.id,
    first_name: p.firstName ?? null,
    age_range: p.ageRange ?? null,
    employment_status: p.employmentStatus ?? null,
    children: p.children ?? null,
    housing_status: p.housingStatus ?? null,
    region: p.region ?? null,
    municipality: p.municipality ?? null,
    income_range: p.incomeRange ?? null,
    onboarding_completed: p.onboardingCompleted,
    updated_at: p.updatedAt,
  };
}

function fromRow(r: ProfileRow): UserProfile {
  return {
    id: r.id,
    firstName: r.first_name ?? undefined,
    ageRange: r.age_range ?? undefined,
    employmentStatus: r.employment_status ?? undefined,
    children: r.children ?? undefined,
    housingStatus: r.housing_status ?? undefined,
    region: r.region ?? undefined,
    municipality: r.municipality ?? undefined,
    incomeRange: r.income_range ?? undefined,
    onboardingCompleted: r.onboarding_completed,
    updatedAt: r.updated_at,
  };
}

function isAccountSession() {
  return useAppStore.getState().session?.mode === 'account' && supabase !== null;
}

async function pushRemote(profile: UserProfile) {
  if (!isAccountSession() || !supabase) return;
  const { error } = await supabase.from('profiles').upsert(toRow(profile));
  if (error) logger.error('profile.push', error);
}

export const profileService = {
  createEmpty(userId: string): UserProfile {
    return { id: userId, onboardingCompleted: false, updatedAt: new Date().toISOString() };
  },

  /** Saves locally first (instant UI), then syncs to Supabase when signed in. */
  async save(patch: Partial<Omit<UserProfile, 'id'>>): Promise<UserProfile | null> {
    const store = useProfileStore.getState();
    if (!store.profile) {
      const userId = useAppStore.getState().session?.userId;
      if (!userId) return null;
      store.setProfile(profileService.createEmpty(userId));
    }
    const next = useProfileStore.getState().updateProfile(patch);
    if (next) await pushRemote(next);
    return next;
  },

  async clearField(field: keyof Omit<UserProfile, 'id' | 'onboardingCompleted' | 'updatedAt'>) {
    return profileService.save({ [field]: undefined });
  },

  async fetchRemote(userId: string): Promise<UserProfile | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) {
      logger.error('profile.fetch', error);
      return null;
    }
    return data ? fromRow(data as ProfileRow) : null;
  },
};
