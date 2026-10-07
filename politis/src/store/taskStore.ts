import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task } from '@/types/models';
import { persistStorage } from './storage';

interface TaskState {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  upsertTask: (task: Task) => void;
  patchTask: (id: string, patch: Partial<Task>) => Task | null;
  removeTask: (id: string) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      setTasks: (tasks) => set({ tasks }),
      upsertTask: (task) =>
        set((s) => {
          const exists = s.tasks.some((t) => t.id === task.id);
          return { tasks: exists ? s.tasks.map((t) => (t.id === task.id ? task : t)) : [task, ...s.tasks] };
        }),
      patchTask: (id, patch) => {
        const current = get().tasks.find((t) => t.id === id);
        if (!current) return null;
        const next = { ...current, ...patch };
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? next : t)) }));
        return next;
      },
      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
    }),
    { name: 'politis.tasks', storage: persistStorage, version: 1 },
  ),
);
