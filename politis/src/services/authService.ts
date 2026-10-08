import { analytics } from '@/lib/analytics';
import { env } from '@/lib/env';
import { createId } from '@/lib/id';
import { logger } from '@/lib/logger';
import { cancelAllReminders } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { hasPublishedContent } from '@/data/content';
import { buildMockTasks } from '@/data/mock';
import { useAppStore } from '@/store/appStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useProfileStore } from '@/store/profileStore';
import { useTaskStore } from '@/store/taskStore';
import { profileService } from './profileService';
import { taskService } from './taskService';

export type AuthResult =
  | { ok: true; needsEmailConfirmation?: boolean }
  | { ok: false; message: string };

/** Maps technical auth errors to calm Greek messages. Technical details go to the logger only. */
function friendlyAuthError(error: unknown): string {
  logger.error('auth', error);
  const msg = error instanceof Error ? error.message.toLowerCase() : '';
  if (msg.includes('invalid login')) return 'Λάθος email ή κωδικός.';
  if (msg.includes('already registered') || msg.includes('already exists')) return 'Υπάρχει ήδη λογαριασμός με αυτό το email.';
  if (msg.includes('password')) return 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.';
  if (msg.includes('email')) return 'Έλεγξε ότι το email είναι σωστό.';
  return 'Κάτι πήγε στραβά. Δοκίμασε ξανά.';
}

async function hydrateAccount(userId: string, email: string | undefined) {
  useAppStore.getState().setSession({ mode: 'account', userId, email });
  const [profile, tasks] = await Promise.all([profileService.fetchRemote(userId), taskService.fetchRemote(userId)]);
  useProfileStore.getState().setProfile(profile ?? profileService.createEmpty(userId));
  useTaskStore.getState().setTasks(tasks ?? []);
}

export const authService = {
  isAvailable: env.isSupabaseConfigured,

  async signUp(email: string, password: string): Promise<AuthResult> {
    if (!supabase) return { ok: false, message: 'Η δημιουργία λογαριασμού δεν είναι διαθέσιμη αυτή τη στιγμή.' };
    try {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) throw error;
      analytics.track('signup_completed', { method: 'email' });
      if (!data.session || !data.user) return { ok: true, needsEmailConfirmation: true };
      await hydrateAccount(data.user.id, data.user.email ?? undefined);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: friendlyAuthError(error) };
    }
  },

  async signIn(email: string, password: string): Promise<AuthResult> {
    if (!supabase) return { ok: false, message: 'Η σύνδεση δεν είναι διαθέσιμη αυτή τη στιγμή.' };
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      await hydrateAccount(data.user.id, data.user.email ?? undefined);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: friendlyAuthError(error) };
    }
  },

  /** Local demo mode: no account, data stays on the device. Sample tasks are seeded only while the app runs on mock content. */
  startDemo() {
    const userId = createId('demo');
    useAppStore.getState().setSession({ mode: 'demo', userId });
    useProfileStore.getState().setProfile(profileService.createEmpty(userId));
    useTaskStore.getState().setTasks(hasPublishedContent ? [] : buildMockTasks());
    analytics.track('signup_completed', { method: 'demo' });
  },

  /** Re-validates a persisted Supabase session on app start. */
  async restore(): Promise<void> {
    const session = useAppStore.getState().session;
    if (session?.mode !== 'account' || !supabase) return;
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        await authService.signOut();
        return;
      }
      const [profile, tasks] = await Promise.all([
        profileService.fetchRemote(session.userId),
        taskService.fetchRemote(session.userId),
      ]);
      if (profile) useProfileStore.getState().setProfile(profile);
      if (tasks) useTaskStore.getState().setTasks(tasks);
    } catch (error) {
      // Offline: keep local data.
      logger.error('auth.restore', error);
    }
  },

  async signOut(): Promise<void> {
    try {
      if (supabase && useAppStore.getState().session?.mode === 'account') await supabase.auth.signOut();
    } catch (error) {
      logger.error('auth.signOut', error);
    }
    await cancelAllReminders();
    useProfileStore.getState().setProfile(null);
    useTaskStore.getState().setTasks([]);
    useNotificationStore.getState().clear();
    useAppStore.getState().setSession(null);
  },
};
