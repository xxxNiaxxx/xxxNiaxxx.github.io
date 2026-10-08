import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { currentMonthKey, FREE_ASSISTANT_QUESTIONS_PER_MONTH } from '@/lib/premium';
import { persistStorage } from './storage';

export type Plan = 'free' | 'plus';

interface PremiumState {
  plan: Plan;
  /** 'demo' = activated from the test switch, not a real purchase. */
  source: 'none' | 'demo' | 'store';
  assistantUsage: { month: string; count: number };
  setPlan: (plan: Plan, source: PremiumState['source']) => void;
  recordAssistantQuestion: () => void;
  reset: () => void;
}

export const usePremiumStore = create<PremiumState>()(
  persist(
    (set) => ({
      plan: 'free',
      source: 'none',
      assistantUsage: { month: currentMonthKey(), count: 0 },
      setPlan: (plan, source) => set({ plan, source: plan === 'free' ? 'none' : source }),
      recordAssistantQuestion: () =>
        set((s) => {
          const month = currentMonthKey();
          const count = s.assistantUsage.month === month ? s.assistantUsage.count + 1 : 1;
          return { assistantUsage: { month, count } };
        }),
      reset: () => set({ plan: 'free', source: 'none', assistantUsage: { month: currentMonthKey(), count: 0 } }),
    }),
    { name: 'politis.premium', storage: persistStorage, version: 1 },
  ),
);

/** Derived premium state for screens. */
export function usePremium() {
  const plan = usePremiumStore((s) => s.plan);
  const source = usePremiumStore((s) => s.source);
  const usage = usePremiumStore((s) => s.assistantUsage);
  const isPlus = plan === 'plus';
  const used = usage.month === currentMonthKey() ? usage.count : 0;
  const remaining = isPlus ? Infinity : Math.max(0, FREE_ASSISTANT_QUESTIONS_PER_MONTH - used);
  return { isPlus, source, used, remaining, canAskAssistant: isPlus || remaining > 0 };
}
