import { Linking, Text, View } from "react-native";
import { Button, Card, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useMutation } from "@/lib/use-mutation";
import { colors } from "@/theme";

/** Asks users who signed up before the current terms to accept them; in the shared demo, says what it is. */
export function TermsBanner() {
  const { session, serverUrl, refresh } = useSession();
  const { run, pending } = useMutation();
  if (session?.organization.isDemo) {
    return (
      <Card style={{ gap: 6, borderColor: colors.accent }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>Λογαριασμός επίδειξης</Text>
        <Text style={styles.rowSub}>Δοκιμάστε ελεύθερα: τα δεδομένα επαναφέρονται κάθε βράδυ και τα βλέπουν και άλλοι επισκέπτες, γι' αυτό μη βάζετε πραγματικά στοιχεία.</Text>
      </Card>
    );
  }
  if (!session || session.termsAccepted !== false) return null;
  return (
    <Card style={{ gap: 10, borderColor: colors.info }}>
      <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>Όροι χρήσης και GDPR</Text>
      <Text style={styles.rowSub}>
        Δημοσιεύσαμε Όρους χρήσης και Σύμβαση επεξεργασίας δεδομένων και ενημερώσαμε την Πολιτική απορρήτου. Διαβάστε τα και
        αποδεχτείτε τα για να συνεχίσετε.
      </Text>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Button small variant="ghost" title="Όροι" onPress={() => Linking.openURL(`${serverUrl}/terms`)} />
        <Button small variant="ghost" title="GDPR" onPress={() => Linking.openURL(`${serverUrl}/dpa`)} />
        <Button small variant="ghost" title="Απόρρητο" onPress={() => Linking.openURL(`${serverUrl}/privacy`)} />
      </View>
      <Button title="Αποδέχομαι" loading={pending} onPress={() => void run(() => api("/api/me/terms", { method: "POST" }), { onSuccess: () => void refresh() })} />
    </Card>
  );
}
