import { router } from "expo-router";
import { Alert, Linking, Text, View } from "react-native";
import { Button, Card, Screen, styles } from "@/components/ui";
import { humanize } from "@/lib/format";
import { useSession } from "@/lib/session";
import { colors } from "@/theme";

export default function More() {
  const { session, serverUrl, signOut } = useSession();
  if (!session) return null;
  return (
    <Screen>
      <Card>
        <Text style={styles.sectionTitle}>{session.user.name ?? session.user.email}</Text>
        <Text style={styles.rowSub}>{session.user.email}</Text>
        <View style={[styles.row, { marginTop: 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowSub}>Οργανισμός</Text>
            <Text style={styles.rowTitle}>{session.organization.name}</Text>
          </View>
          <Text style={[styles.rowSub, { color: colors.accent }]}>{humanize(session.role)}</Text>
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowSub}>Server</Text>
            <Text style={styles.rowTitle} numberOfLines={1}>{serverUrl}</Text>
          </View>
        </View>
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Πλήρης εφαρμογή</Text>
        <Text style={[styles.rowSub, { marginTop: 4 }]}>
          Ακίνητα, επισκέπτες, κρατήσεις, οικονομικά, φορολογικά και ρυθμίσεις υπάρχουν στην εφαρμογή web.
        </Text>
        <Button title="Άνοιγμα εφαρμογής web" variant="outline" style={{ marginTop: 12 }} onPress={() => Linking.openURL(serverUrl)} />
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Απόρρητο</Text>
        <Button title="Πολιτική απορρήτου" variant="outline" style={{ marginTop: 12 }} onPress={() => Linking.openURL(`${serverUrl}/privacy`)} />
        <Button title="Διαγραφή λογαριασμού" variant="danger" style={{ marginTop: 8 }} onPress={() => router.push("/delete-account")} />
      </Card>
      <Button
        title="Αποσύνδεση"
        variant="danger"
        onPress={() => Alert.alert("Αποσύνδεση;", undefined, [{ text: "Ακύρωση", style: "cancel" }, { text: "Αποσύνδεση", style: "destructive", onPress: () => void signOut() }])}
      />
    </Screen>
  );
}
