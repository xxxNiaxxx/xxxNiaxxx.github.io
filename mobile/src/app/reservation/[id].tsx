import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Text, TextInput, View } from "react-native";
import { Badge, Button, Card, ErrorBox, Loading, Screen, SectionTitle, statusTone, styles } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, formatDay, formatMoney, humanize } from "@/lib/format";
import type { Message, Reservation, Task } from "@/lib/types";
import { useQuery } from "@/lib/use-query";
import { colors } from "@/theme";

interface Details {
  reservation: Reservation;
  tasks: Task[];
  messages: Message[];
}

export default function ReservationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, refreshing, reload } = useQuery<Details>(`/api/reservations/${id}`);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  if (loading && !data) return <Loading />;
  if (!data) return <Screen>{error && <ErrorBox message={error} onRetry={reload} />}</Screen>;
  const r = data.reservation;
  const open = r.status === "CONFIRMED" || r.status === "PENDING";

  async function send() {
    setSending(true);
    try {
      await api("/api/messages", { body: { reservationId: r.id, content: message, send: true } });
      setMessage("");
      void reload();
    } catch (e) {
      Alert.alert("Η αποστολή απέτυχε", e instanceof ApiError ? e.message : "Δοκιμάστε ξανά.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Stack.Screen options={{ title: r.guestName ?? "Κράτηση" }} />
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.sectionTitle}>{r.propertyName}</Text>
          <Badge label={humanize(r.status)} tone={statusTone[r.status]} />
        </View>
        <Text style={[styles.rowSub, { marginTop: 6 }]}>{formatDay(r.checkIn)} → {formatDay(r.checkOut)} · {r.nights} νύχτες · {r.guestsCount} άτομα</Text>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text, marginTop: 10 }}>{formatMoney(r.totalAmount, r.currency)}</Text>
        <Text style={styles.rowSub}>{r.confirmationCode ?? "Χωρίς κωδικό κράτησης"} · {humanize(r.source)}</Text>
        {r.notes && <Text style={{ marginTop: 10, backgroundColor: colors.muted, padding: 10, borderRadius: 10, color: colors.text }}>{r.notes}</Text>}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
          {r.guestPhone && <Button small variant="outline" title="Κλήση" onPress={() => Linking.openURL(`tel:${r.guestPhone}`)} />}
          {r.guestEmail && <Button small variant="outline" title="Email" onPress={() => Linking.openURL(`mailto:${r.guestEmail}`)} />}
        </View>
      </Card>

      <Card>
        <SectionTitle title="Εργασίες" count={data.tasks.length} />
        {data.tasks.length === 0 && <Text style={styles.rowSub}>Δεν υπάρχουν εργασίες για τη διαμονή.</Text>}
        {data.tasks.map((t) => (
          <View key={t.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{t.title}</Text>
              <Text style={styles.rowSub}>{humanize(t.type)}{t.dueAt ? ` · ${formatDateTime(t.dueAt)}` : ""}</Text>
            </View>
            <Badge label={humanize(t.status)} tone={statusTone[t.status]} />
          </View>
        ))}
      </Card>

      <Card>
        <SectionTitle title="Μηνύματα" count={data.messages.length} />
        {open && (
          <View style={{ gap: 8, marginBottom: 8 }}>
            <TextInput value={message} onChangeText={setMessage} multiline placeholder="Γράψτε στον επισκέπτη…" placeholderTextColor={colors.subtleText}
              style={[styles.input, { height: 90, paddingTop: 10, textAlignVertical: "top" }]} />
            <Button small title="Αποστολή" loading={sending} disabled={!message.trim()} onPress={send} style={{ alignSelf: "flex-end" }} />
          </View>
        )}
        {data.messages.map((m) => (
          <View key={m.id} style={[styles.row, { flexDirection: "column", alignItems: "stretch", gap: 4 }]}>
            <Text style={styles.rowSub}>{m.direction === "OUTBOUND" ? "Εσείς" : "Επισκέπτης"} · {formatDateTime(m.sentAt ?? m.createdAt)} · {humanize(m.status)}</Text>
            <Text style={{ color: colors.text }}>{m.content}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
