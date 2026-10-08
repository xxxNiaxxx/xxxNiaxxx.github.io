/**
 * Local notification architecture.
 * Reminders are scheduled on-device with expo-notifications. Remote push infrastructure is
 * intentionally mocked for the MVP (see `registerForRemotePush`).
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { logger } from './logger';

type NotificationsModule = typeof import('expo-notifications');

const ANDROID_CHANNEL_ID = 'reminders';

/**
 * Expo Go on Android throws as soon as expo-notifications is imported (SDK 53+), so the module
 * is loaded lazily and only where it works. Elsewhere reminders are skipped and the in-app
 * notification inbox still works.
 */
const isExpoGoAndroid = Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const isSupported = (Platform.OS === 'ios' || Platform.OS === 'android') && !isExpoGoAndroid;

let cached: NotificationsModule | null | undefined;
function getNotifications(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  if (!isSupported) return (cached = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as NotificationsModule;
  } catch (error) {
    logger.error('notifications.load', error);
    cached = null;
  }
  return cached;
}

export interface ReminderPayload {
  taskId?: string;
  benefitId?: string;
}

export async function initNotifications(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Υπενθυμίσεις',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
  } catch (error) {
    logger.error('notifications.init', error);
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch (error) {
    logger.error('notifications.permission', error);
    return false;
  }
}

/** True when this build can schedule local reminders (not web, not Expo Go on Android). */
export const remindersAvailable = isSupported;

/** Schedules a local reminder. Returns the notification id, or null if unavailable. */
export async function scheduleReminder(
  title: string,
  body: string,
  date: Date,
  payload: ReminderPayload,
): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications || date.getTime() <= Date.now()) return null;
  const granted = await ensureNotificationPermission();
  if (!granted) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { ...payload } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined,
      },
    });
  } catch (error) {
    logger.error('notifications.schedule', error);
    return null;
  }
}

export async function cancelReminder(id: string | null | undefined): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications || !id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (error) {
    logger.error('notifications.cancel', error);
  }
}

export async function cancelAllReminders(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    logger.error('notifications.cancelAll', error);
  }
}

/** Subscribes to taps on delivered notifications. Returns an unsubscribe function. */
export function onReminderOpened(handler: (payload: ReminderPayload) => void): () => void {
  const Notifications = getNotifications();
  if (!Notifications) return () => undefined;
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as ReminderPayload | undefined;
    handler({ taskId: data?.taskId, benefitId: data?.benefitId });
  });
  return () => sub.remove();
}

/**
 * MOCK: remote push registration. A production build would obtain an Expo push token here
 * and store it server-side. Kept as a no-op so the MVP runs in Expo Go without a project id.
 */
export async function registerForRemotePush(): Promise<string | null> {
  logger.info('notifications', 'Remote push is mocked in the MVP');
  return null;
}
