import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router, SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { analytics } from '@/lib/analytics';
import { logger } from '@/lib/logger';
import { initNotifications, onReminderOpened } from '@/lib/notifications';
import { authService } from '@/services/authService';
import { taskService } from '@/services/taskService';
import { useAppStore } from '@/store/appStore';
import { useStoresHydrated } from '@/store/hydration';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
});

export default function RootLayout() {
  const hydrated = useStoresHydrated();
  const [ready, setReady] = useState(false);
  const analyticsEnabled = useAppStore((s) => s.preferences.analyticsEnabled);

  useEffect(() => {
    analytics.setOptIn(analyticsEnabled);
  }, [analyticsEnabled]);

  useEffect(() => {
    if (!hydrated) return;
    (async () => {
      try {
        await initNotifications();
        await authService.restore();
        taskService.generateDeadlineNotifications();
      } catch (error) {
        logger.error('bootstrap', error);
      } finally {
        setReady(true);
        SplashScreen.hideAsync().catch(() => undefined);
      }
    })();
  }, [hydrated]);

  useEffect(
    () =>
      onReminderOpened(({ taskId }) => {
        analytics.track('notification_opened', { contentType: 'task' });
        if (taskId) router.push({ pathname: '/tasks/[id]', params: { id: taskId } });
      }),
    [],
  );

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
          <Stack.Screen name="auth" />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="tasks/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="profile-edit" options={{ presentation: 'modal' }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
