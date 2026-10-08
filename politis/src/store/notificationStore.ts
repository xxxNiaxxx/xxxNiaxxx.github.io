import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { InAppNotification } from '@/types/models';
import { createId } from '@/lib/id';
import { persistStorage } from './storage';

interface NotificationState {
  items: InAppNotification[];
  add: (n: Omit<InAppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      items: [],
      add: (n) =>
        set((s) => {
          if (n.key && s.items.some((i) => i.key === n.key)) return s;
          return {
            items: [{ ...n, id: createId('ntf'), createdAt: new Date().toISOString(), read: false }, ...s.items].slice(0, 50),
          };
        }),
      markRead: (id) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, read: true } : i)) })),
      markAllRead: () => set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'politis.notifications', storage: persistStorage, version: 1 },
  ),
);
