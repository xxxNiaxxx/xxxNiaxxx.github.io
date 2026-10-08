import { Redirect } from 'expo-router';
import { useAppStore } from '@/store/appStore';
import { useProfileStore } from '@/store/profileStore';

/** Splash/entry route: decides where the user belongs. */
export default function Index() {
  const session = useAppStore((s) => s.session);
  const profile = useProfileStore((s) => s.profile);
  if (!session) return <Redirect href="/welcome" />;
  if (!profile?.onboardingCompleted) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
