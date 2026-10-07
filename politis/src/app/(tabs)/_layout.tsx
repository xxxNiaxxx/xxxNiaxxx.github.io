import { Redirect } from 'expo-router';
import Tabs from 'expo-router/js-tabs';
import { House, ListChecks, Search, Sparkles, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/appStore';
import { useProfileStore } from '@/store/profileStore';
import { colors, spacing } from '@/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const session = useAppStore((s) => s.session);
  const onboarded = useProfileStore((s) => s.profile?.onboardingCompleted ?? false);
  if (!session) return <Redirect href="/welcome" />;
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
        tabBarAllowFontScaling: true,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 68 + insets.bottom,
          paddingTop: spacing.xs + 2,
          paddingBottom: Math.max(insets.bottom, spacing.xs + 2),
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Αρχική', tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }} />
      <Tabs.Screen name="search" options={{ title: 'Αναζήτηση', tabBarIcon: ({ color, size }) => <Search color={color} size={size} /> }} />
      <Tabs.Screen name="assistant" options={{ title: 'Βοηθός', tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} /> }} />
      <Tabs.Screen name="tasks" options={{ title: 'Εργασίες', tabBarIcon: ({ color, size }) => <ListChecks color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Προφίλ', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
    </Tabs>
  );
}

export const unstable_settings = { initialRouteName: 'index' };
