import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { Linking, Pressable, Text, View } from "react-native";
import { Button, Card, Screen, styles } from "@/components/ui";
import { humanize } from "@/lib/format";
import { useSession } from "@/lib/session";
import { confirm } from "@/lib/use-mutation";
import { colors } from "@/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const SECTIONS: { title: string; items: { label: string; icon: IconName; href: Href; detail?: string }[] }[] = [
  {
    title: "Διαχείριση",
    items: [
      { label: "Κρατήσεις", icon: "book-outline", href: "/reservations" },
      { label: "Ακίνητα", icon: "business-outline", href: "/properties" },
      { label: "Επισκέπτες", icon: "people-outline", href: "/guests" },
      { label: "Οικονομικά", icon: "wallet-outline", href: "/financials" },
      { label: "Φορολογικά & ΑΑΔΕ", icon: "library-outline", href: "/tax", detail: "Δηλώσεις διαμονής, ΤΑΚΚ, Ε2" },
    ],
  },
  {
    title: "Βοηθός AI",
    items: [{ label: "Γνώσεις του βοηθού", icon: "bulb-outline", href: "/knowledge", detail: "Τι έχει μάθει από την ομάδα" }],
  },
  {
    title: "Οργανισμός",
    items: [
      { label: "Ομάδα", icon: "people-circle-outline", href: "/team", detail: "Μέλη και προσκλήσεις" },
      { label: "Ρυθμίσεις", icon: "settings-outline", href: "/settings", detail: "Προφίλ, οργανισμός" },
    ],
  },
];

export default function More() {
  const { session, serverUrl, signOut } = useSession();
  if (!session) return null;
  return (
    <Screen>
      <Card>
        <Text style={styles.sectionTitle}>{session.user.name ?? session.user.email}</Text>
        <Text style={styles.rowSub}>{session.organization.name} · {humanize(session.role)}</Text>
      </Card>
      {SECTIONS.map((section) => (
        <View key={section.title}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.mutedText, textTransform: "uppercase", marginBottom: 6, marginLeft: 4 }}>{section.title}</Text>
          <Card style={{ paddingVertical: 4 }}>
            {section.items.map((item, i) => (
              <Pressable key={item.label} onPress={() => router.push(item.href)} style={({ pressed }) => [styles.row, i === 0 && { borderTopWidth: 0 }, pressed && { opacity: 0.6 }]}>
                <Ionicons name={item.icon} size={22} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.label}</Text>
                  {item.detail ? <Text style={styles.rowSub}>{item.detail}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.subtleText} />
              </Pressable>
            ))}
          </Card>
        </View>
      ))}
      <Card>
        <Text style={styles.sectionTitle}>Απόρρητο</Text>
        <Button title="Πολιτική απορρήτου" variant="outline" style={{ marginTop: 12 }} onPress={() => Linking.openURL(`${serverUrl}/privacy`)} />
        <Button title="Διαγραφή λογαριασμού" variant="danger" style={{ marginTop: 8 }} onPress={() => router.push("/delete-account")} />
      </Card>
      <Button title="Αποσύνδεση" variant="danger" onPress={() => confirm("Αποσύνδεση;", undefined, "Αποσύνδεση", () => void signOut())} />
    </Screen>
  );
}
