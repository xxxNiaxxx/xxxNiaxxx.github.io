import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import { Segmented } from "@/components/form";
import { Button, Card, Screen, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { humanize } from "@/lib/format";
import { useSession } from "@/lib/session";
import { confirm, notify, useMutation } from "@/lib/use-mutation";
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
    items: [
      { label: "Ο βοηθός σάς ρωτά", icon: "help-circle-outline", href: "/interview", detail: "Ερωτήσεις ή ανάγνωση από Booking.com" },
      { label: "Γνώσεις του βοηθού", icon: "bulb-outline", href: "/knowledge", detail: "Τι έχει μάθει από την ομάδα" },
    ],
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
      <FeedbackCard />
      <Card>
        <Text style={styles.sectionTitle}>Βοήθεια</Text>
        <Text style={styles.rowSub}>Πώς υπολογίζονται ποσά, προμήθειες και φόροι, και τι ισχύει με πολλά καταλύματα.</Text>
        <Button title="Πώς λειτουργεί" variant="outline" style={{ marginTop: 12 }} onPress={() => Linking.openURL(`${serverUrl}/help`)} />
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Απόρρητο και όροι</Text>
        <Button title="Πολιτική απορρήτου" variant="outline" style={{ marginTop: 12 }} onPress={() => Linking.openURL(`${serverUrl}/privacy`)} />
        <Button title="Όροι χρήσης" variant="outline" style={{ marginTop: 8 }} onPress={() => Linking.openURL(`${serverUrl}/terms`)} />
        <Button title="Σύμβαση επεξεργασίας δεδομένων (GDPR)" variant="outline" style={{ marginTop: 8 }} onPress={() => Linking.openURL(`${serverUrl}/dpa`)} />
        <Button title="Διαγραφή λογαριασμού" variant="danger" style={{ marginTop: 8 }} onPress={() => router.push("/delete-account")} />
      </Card>
      <Button title="Αποσύνδεση" variant="danger" onPress={() => confirm("Αποσύνδεση;", undefined, "Αποσύνδεση", () => void signOut())} />
    </Screen>
  );
}

const KINDS = [
  { value: "BUG", label: "Πρόβλημα" },
  { value: "IDEA", label: "Ιδέα" },
  { value: "OTHER", label: "Σχόλιο" },
];

/** "Στείλτε σχόλιο": a problem or an idea, straight to the app's team. */
function FeedbackCard() {
  const [kind, setKind] = useState("BUG");
  const [message, setMessage] = useState("");
  const { run, pending } = useMutation();
  return (
    <Card style={{ gap: 10 }}>
      <Text style={styles.sectionTitle}>Στείλτε σχόλιο</Text>
      <Segmented options={KINDS.map((k) => ({ key: k.value, label: k.label }))} value={kind} onChange={setKind} />
      <TextInput value={message} onChangeText={setMessage} multiline placeholder="Τι δεν δουλεύει ή τι θα σας βοηθούσε;" placeholderTextColor={colors.subtleText}
        style={[styles.input, { height: 100, paddingTop: 10, textAlignVertical: "top" }]} />
      <Button small title="Αποστολή" loading={pending} disabled={message.trim().length < 3} style={{ alignSelf: "flex-start" }}
        onPress={() => void run(() => api("/api/feedback", { body: { kind, message, client: "mobile" } }), {
          onSuccess: () => { setMessage(""); notify("Ευχαριστούμε! Το λάβαμε."); },
        })} />
    </Card>
  );
}
