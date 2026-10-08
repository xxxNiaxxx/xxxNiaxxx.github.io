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
      setError(e instanceof ApiError ? e.message : "Could not delete the account. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Card>
        <Text style={styles.sectionTitle}>Delete your account?</Text>
        <Text style={[styles.rowSub, { marginTop: 8, lineHeight: 19 }]}>
          This permanently deletes your account and AI chat history. Organizations where you are the only member are deleted
          with all their properties, guests, reservations, tasks and financial records. In shared organizations only your
          membership is removed. This cannot be undone.
        </Text>
      </Card>
      <View>
        <Text style={styles.label}>Confirm with your password</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      </View>
      {error && <Text style={{ color: colors.danger, backgroundColor: colors.dangerSoft, padding: 12, borderRadius: 10 }}>{error}</Text>}
      <Button title="Delete permanently" variant="danger" loading={busy} disabled={!password} onPress={confirm} />
      <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
