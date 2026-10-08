import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SessionProvider } from "@/lib/session";
import { colors } from "@/theme";

export { ErrorBoundary } from "expo-router";

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="reservation/[id]" options={{ title: "Κράτηση", headerBackTitle: "Πίσω" }} />
        <Stack.Screen name="delete-account" options={{ title: "Διαγραφή λογαριασμού", presentation: "modal" }} />
      </Stack>
    </SessionProvider>
  );
}
