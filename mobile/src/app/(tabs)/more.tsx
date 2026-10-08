import { router } from "expo-router";
import { Alert, Linking, Text, View } from "react-native";
import { Button, Card, Screen, styles } from "@/components/ui";
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
            <Text style={styles.rowSub}>Organization</Text>
            <Text style={styles.rowTitle}>{session.organization.name}</Text>
          </View>
          <Text style={[styles.rowSub, { color: colors.accent }]}>{session.role.toLowerCase()}</Text>
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowSub}>Server</Text>
            <Text style={styles.rowTitle} numberOfLines={1}>{serverUrl}</Text>
          </View>
        </View>
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Full workspace</Text>
        <Text style={[styles.rowSub, { marginTop: 4 }]}>
          Properties, guests, reservations, financials and settings are available in the web app.
        </Text>
        <Button title="Open web app" variant="outline" style={{ marginTop: 12 }} onPress={() => Linking.openURL(serverUrl)} />
      </Card>
      <Card>
        <Text style={styles.sectionTitle}>Privacy</Text>
        <Button title="Privacy policy" variant="outline" style={{ marginTop: 12 }} onPress={() => Linking.openURL(`${serverUrl}/privacy`)} />
        <Button title="Delete account" variant="danger" style={{ marginTop: 8 }} onPress={() => router.push("/delete-account")} />
      </Card>
      <Button
        title="Sign out"
        variant="danger"
        onPress={() => Alert.alert("Sign out?", undefined, [{ text: "Cancel", style: "cancel" }, { text: "Sign out", style: "destructive", onPress: () => void signOut() }])}
      />
    </Screen>
  );
}
