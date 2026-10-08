import { router } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Button, Card, Screen, styles } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { colors } from "@/theme";

/** In-app account deletion (required by Google Play for apps with accounts). */
export default function DeleteAccount() {
  const { signOut } = useSession();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/me", { method: "DELETE", body: { password } });
      await signOut();
      router.replace("/login");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Δεν ήταν δυνατή η διαγραφή. Δοκιμάστε ξανά.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.sectionTitle}>Διαγραφή λογαριασμού;</Text>
        <Text style={[styles.rowSub, { marginTop: 8, lineHeight: 19 }]}>
          Ο λογαριασμός σας και το ιστορικό συνομιλιών AI διαγράφονται οριστικά. Οι οργανισμοί όπου είστε το μόνο μέλος
          διαγράφονται μαζί με ακίνητα, επισκέπτες, κρατήσεις, εργασίες και οικονομικά στοιχεία. Στους κοινούς οργανισμούς
          αφαιρείται μόνο η συμμετοχή σας. Η ενέργεια δεν αναιρείται.
        </Text>
      </Card>
      <View>
        <Text style={styles.label}>Επιβεβαίωση με τον κωδικό σας</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      </View>
      {error && <Text style={{ color: colors.danger, backgroundColor: colors.dangerSoft, padding: 12, borderRadius: 10 }}>{error}</Text>}
      <Button title="Οριστική διαγραφή" variant="danger" loading={busy} disabled={!password} onPress={confirm} />
      <Button title="Ακύρωση" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
