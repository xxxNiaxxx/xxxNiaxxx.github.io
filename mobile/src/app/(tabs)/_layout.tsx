import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { Loading } from "@/components/ui";
import { useSession } from "@/lib/session";
import { colors } from "@/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
const icon = (name: IconName) => ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} color={color} size={size} />;

export default function TabsLayout() {
  const { ready, session } = useSession();
  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/login" />;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.mutedText,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700" },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Αρχική", headerTitle: session.organization.name, tabBarIcon: icon("home-outline") }} />
      <Tabs.Screen name="calendar" options={{ title: "Ημερολόγιο", tabBarIcon: icon("calendar-outline") }} />
      <Tabs.Screen name="tasks" options={{ title: "Εργασίες", tabBarIcon: icon("checkbox-outline") }} />
      <Tabs.Screen name="ai" options={{ title: "AI", headerTitle: "Βοηθός AI", tabBarIcon: icon("sparkles-outline") }} />
      <Tabs.Screen name="more" options={{ title: "Περισσότερα", tabBarIcon: icon("menu-outline") }} />
    </Tabs>
  );
}
