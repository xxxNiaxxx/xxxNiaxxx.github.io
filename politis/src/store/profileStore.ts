import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '@/types/models';
import { persistStorage } from './storage';

interface ProfileState {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;
  updateProfile: (patch: Partial<Omit<UserProfile, 'id'>>) => UserProfile | null;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),
      updateProfile: (patch) => {
        const current = get().profile;
        if (!current) return null;
        const next: UserProfile = { ...current, ...patch, updatedAt: new Date().toISOString() };
        set({ profile: next });
        return next;
      },
    }),
    { name: 'politis.profile', storage: persistStorage, version: 1 },
  ),
);
