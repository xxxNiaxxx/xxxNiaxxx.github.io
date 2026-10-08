import { Redirect, Stack, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Loading } from "@/components/ui";
import { SessionProvider, useSession } from "@/lib/session";
import { colors } from "@/theme";

export { ErrorBoundary } from "expo-router";

/** Screens that work without signing in. */
const PUBLIC = new Set(["login"]);

function RootNavigator() {
  const { ready, session } = useSession();
  const segments = useSegments();
  // Wait for the stored session so screens opened directly (deep links, reloads) call the API signed in.
  if (!ready) return <Loading />;
  if (!session && segments[0] && !PUBLIC.has(segments[0]) && segments[0] !== "(tabs)") return <Redirect href="/login" />;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerBackTitle: "Πίσω",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="reservation/[id]" options={{ title: "Κράτηση" }} />
      <Stack.Screen name="delete-account" options={{ title: "Διαγραφή λογαριασμού", presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </SessionProvider>
  );
}
