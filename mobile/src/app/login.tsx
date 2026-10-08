import { Redirect } from "expo-router";
import * as Linking from "expo-linking";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { Button, Loading, styles } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { colors } from "@/theme";

export default function Login() {
  const { ready, session, serverUrl, signIn } = useSession();
  const [server, setServer] = useState(serverUrl);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!ready) return <Loading />;
  if (session) return <Redirect href="/" />;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await signIn({ email, password, serverUrl: server });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Η σύνδεση απέτυχε");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 80, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#2DD4BF" }} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text }}>Βραχυχρόνια.ai</Text>
        </View>
        <Text style={{ fontSize: 28, fontWeight: "700", color: colors.text, marginTop: 24, letterSpacing: -0.5 }}>Καλώς ήρθατε</Text>
        <Text style={{ color: colors.mutedText, marginTop: -8 }}>Συνδεθείτε για να διαχειριστείτε τα ακίνητά σας.</Text>

        <View>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="email@example.com" placeholderTextColor={colors.subtleText} />
        </View>
        <View>
          <Text style={styles.label}>Κωδικός</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" onSubmitEditing={submit} />
        </View>
        {error && <Text style={{ color: colors.danger, backgroundColor: colors.dangerSoft, padding: 12, borderRadius: 10 }}>{error}</Text>}
        <Button title="Σύνδεση" loading={busy} disabled={!email || !password} onPress={submit} />
        <Button title="Δημιουργία λογαριασμού" variant="outline" onPress={() => Linking.openURL(`${server}/register`)} />
        <Text style={[styles.rowSub, { textAlign: "center" }]} onPress={() => Linking.openURL(`${server}/privacy`)}>
          Πολιτική απορρήτου
        </Text>

        {/* Development only: the store build talks to the server baked in via EXPO_PUBLIC_API_URL. */}
        {__DEV__ && (
          <View style={{ marginTop: 24, gap: 12 }}>
            <Button
              title="Δοκιμαστικός λογαριασμός"
              variant="ghost"
              onPress={() => {
                setEmail("demo@demo-hospitality.test");
                setPassword("demo1234");
              }}
            />
            <View>
              <Text style={styles.label}>Server</Text>
              <TextInput style={styles.input} value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
              <Text style={[styles.rowSub, { marginTop: 6 }]}>Ο υπολογιστής που τρέχει την εφαρμογή web (npm run dev:lan), στο ίδιο δίκτυο με το κινητό.</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
