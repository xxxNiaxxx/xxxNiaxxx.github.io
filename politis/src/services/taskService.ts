import type { Task } from '@/types/models';
import { analytics } from '@/lib/analytics';
import { daysUntil, formatDayMonth, tomorrowMorning } from '@/lib/dates';
import { createUuid } from '@/lib/id';
import { logger } from '@/lib/logger';
import { cancelReminder, scheduleReminder } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/appStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useTaskStore } from '@/store/taskStore';

interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: Task['status'];
  procedure_id: string | null;
  benefit_id: string | null;
  remind_at: string | null;
  created_at: string;
  completed_at: string | null;
}

function toRow(t: Task, userId: string): TaskRow {
  return {
    id: t.id,
    user_id: userId,
    title: t.title,
    description: t.description ?? null,
    due_date: t.dueDate ?? null,
    status: t.status,
    procedure_id: t.procedureId ?? null,
    benefit_id: t.benefitId ?? null,
    remind_at: t.remindAt ?? null,
    created_at: t.createdAt,
    completed_at: t.completedAt ?? null,
  };
}

function fromRow(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    dueDate: r.due_date ?? undefined,
    status: r.status,
    procedureId: r.procedure_id ?? undefined,
    benefitId: r.benefit_id ?? undefined,
    remindAt: r.remind_at ?? undefined,
    createdAt: r.created_at,
    completedAt: r.completed_at ?? undefined,
  };
}

function accountUserId(): string | null {
  const session = useAppStore.getState().session;
  return session?.mode === 'account' && supabase ? session.userId : null;
}

async function pushRemote(task: Task) {
  const userId = accountUserId();
  if (!userId || !supabase) return;
  const { error } = await supabase.from('tasks').upsert(toRow(task, userId));
  if (error) logger.error('tasks.push', error);
}

async function deleteRemote(id: string) {
  const userId = accountUserId();
  if (!userId || !supabase) return;
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) logger.error('tasks.delete', error);
}

function notificationsEnabled() {
  return useAppStore.getState().preferences.notificationsEnabled;
}

/** Default reminder: the morning of the day before the deadline. */
function defaultReminderDate(dueDate: string | undefined): Date | null {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  d.setDate(d.getDate() - 1);
  d.setHours(9, 0, 0, 0);
  return d.getTime() > Date.now() ? d : null;
}

export interface NewTaskInput {
  title: string;
  description?: string;
  dueDate?: string;
  procedureId?: string;
  benefitId?: string;
}

export const taskService = {
  async create(input: NewTaskInput): Promise<Task> {
    const task: Task = {
      id: createUuid(),
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      dueDate: input.dueDate,
      status: 'pending',
      procedureId: input.procedureId,
      benefitId: input.benefitId,
      createdAt: new Date().toISOString(),
    };
    const remindDate = notificationsEnabled() ? defaultReminderDate(task.dueDate) : null;
    if (remindDate) {
      task.notificationId = await scheduleReminder(
        'Υπενθύμιση προθεσμίας',
        `«${task.title}» — η προθεσμία είναι αύριο.`,
        remindDate,
        { taskId: task.id },
      );
      task.remindAt = remindDate.toISOString();
    }
    useTaskStore.getState().upsertTask(task);
    analytics.track('task_created', { contentType: 'task', contentId: task.procedureId ?? task.benefitId });
    await pushRemote(task);
    return task;
  },

  /** Finds an existing pending task for a procedure, so we don't create duplicates. */
  findPendingForProcedure(procedureId: string): Task | undefined {
    return useTaskStore.getState().tasks.find((t) => t.procedureId === procedureId && t.status === 'pending');
  },

  async complete(id: string): Promise<void> {
    const current = useTaskStore.getState().tasks.find((t) => t.id === id);
    if (!current) return;
    await cancelReminder(current.notificationId);
    const next = useTaskStore.getState().patchTask(id, {
      status: 'done',
      completedAt: new Date().toISOString(),
      notificationId: null,
      remindAt: undefined,
    });
    analytics.track('task_completed', { contentType: 'task' });
    if (next) await pushRemote(next);
  },

  async reopen(id: string): Promise<void> {
    const next = useTaskStore.getState().patchTask(id, { status: 'pending', completedAt: undefined });
    if (next) await pushRemote(next);
  },

  /** «Υπενθύμισέ μου αύριο». Returns the reminder date. */
  async remindTomorrow(id: string): Promise<Date | null> {
    const current = useTaskStore.getState().tasks.find((t) => t.id === id);
    if (!current) return null;
    await cancelReminder(current.notificationId);
    const date = tomorrowMorning();
    const notificationId = notificationsEnabled()
      ? await scheduleReminder('Υπενθύμιση', `Μην ξεχάσεις: «${current.title}»`, date, { taskId: id })
      : null;
    const next = useTaskStore.getState().patchTask(id, { remindAt: date.toISOString(), notificationId });
    if (next) await pushRemote(next);
    return date;
  },

  async remove(id: string): Promise<void> {
    const current = useTaskStore.getState().tasks.find((t) => t.id === id);
    await cancelReminder(current?.notificationId);
    useTaskStore.getState().removeTask(id);
    await deleteRemote(id);
  },

  async fetchRemote(userId: string): Promise<Task[] | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.from('tasks').select('*').eq('user_id', userId).order('due_date', { ascending: true });
    if (error) {
      logger.error('tasks.fetch', error);
      return null;
    }
    return (data as TaskRow[]).map(fromRow);
  },

  /** Adds in-app inbox entries for deadlines that are close (mock for push notifications). */
  generateDeadlineNotifications(): void {
    const { tasks } = useTaskStore.getState();
    const { add } = useNotificationStore.getState();
    for (const t of tasks) {
      if (t.status !== 'pending' || !t.dueDate) continue;
      const days = daysUntil(t.dueDate);
      if (days < 0 || days > 3) continue;
      const when = days === 0 ? 'σήμερα' : days === 1 ? 'αύριο' : `στις ${formatDayMonth(t.dueDate)}`;
      add({
        key: `deadline:${t.id}:${t.dueDate.slice(0, 10)}`,
        title: 'Η προθεσμία πλησιάζει',
        body: `«${t.title}» λήγει ${when}.`,
        taskId: t.id,
      });
    }
  },
};
