import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage } from './storage';

export type SessionMode = 'demo' | 'account';

export interface Session {
  mode: SessionMode;
  userId: string;
  email?: string;
}

export interface Preferences {
  notificationsEnabled: boolean;
  analyticsEnabled: boolean;
}

interface AppState {
  hasSeenWelcome: boolean;
  session: Session | null;
  preferences: Preferences;
  savedBenefitIds: string[];
  setHasSeenWelcome: (seen: boolean) => void;
  setSession: (session: Session | null) => void;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  toggleSavedBenefit: (id: string) => void;
  reset: () => void;
}

const defaults = {
  hasSeenWelcome: false,
  session: null,
  preferences: { notificationsEnabled: true, analyticsEnabled: true },
  savedBenefitIds: [] as string[],
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...defaults,
      setHasSeenWelcome: (hasSeenWelcome) => set({ hasSeenWelcome }),
      setSession: (session) => set({ session }),
      setPreference: (key, value) => set((s) => ({ preferences: { ...s.preferences, [key]: value } })),
      toggleSavedBenefit: (id) =>
        set((s) => ({
          savedBenefitIds: s.savedBenefitIds.includes(id)
            ? s.savedBenefitIds.filter((x) => x !== id)
            : [...s.savedBenefitIds, id],
        })),
      reset: () => set({ ...defaults }),
    }),
    { name: 'politis.app', storage: persistStorage, version: 1 },
  ),
);
