import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Text, TextInput, View } from "react-native";
import { Badge, Button, Card, ErrorBox, Loading, Screen, SectionTitle, statusTone, styles } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, formatDay, formatMoney, humanize } from "@/lib/format";
import type { Message, Reservation, StayTax, Task } from "@/lib/types";
import { confirm, useMutation } from "@/lib/use-mutation";
import { useQuery } from "@/lib/use-query";
import { colors } from "@/theme";

interface Details {
  reservation: Reservation;
  tasks: Task[];
  messages: Message[];
  tax: StayTax;
}

export default function ReservationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, refreshing, reload } = useQuery<Details>(`/api/reservations/${id}`);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [original, setOriginal] = useState<string | null>(null);
  const action = useMutation();

  if (loading && !data) return <Loading />;
  if (!data) return <Screen>{error && <ErrorBox message={error} onRetry={reload} />}</Screen>;
  const r = data.reservation;
  const open = r.status === "CONFIRMED" || r.status === "PENDING";

  async function translate() {
    setTranslating(true);
    try {
      const res = await api<{ text: string; languageName: string }>("/api/ai/translate", { body: { text: message, guestId: r.guestId } });
      setOriginal(message);
      setMessage(res.text);
    } catch (e) {
      Alert.alert("Η μετάφραση δεν έγινε", e instanceof ApiError ? e.message : "Δοκιμάστε ξανά.");
    } finally {
      setTranslating(false);
    }
  }

  async function send() {
    setSending(true);
    try {
      await api("/api/messages", { body: { reservationId: r.id, content: message, send: true } });
      setMessage("");
      setOriginal(null);
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
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text, marginTop: 10 }}>{r.complimentary ? "Δωρεάν φιλοξενία" : formatMoney(r.totalAmount, r.currency)}</Text>
        <Text style={styles.rowSub}>{r.confirmationCode ?? "Χωρίς κωδικό κράτησης"} · {humanize(r.source)}</Text>
        {r.notes && <Text style={{ marginTop: 10, backgroundColor: colors.muted, padding: 10, borderRadius: 10, color: colors.text }}>{r.notes}</Text>}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          {r.guestPhone && <Button small variant="outline" title="Κλήση" onPress={() => Linking.openURL(`tel:${r.guestPhone}`)} />}
          {r.guestEmail && <Button small variant="outline" title="Email" onPress={() => Linking.openURL(`mailto:${r.guestEmail}`)} />}
          <Button small variant="outline" title="Επισκέπτης" onPress={() => router.push(`/guest/${r.guestId}`)} />
          <Button small variant="outline" title="Επεξεργασία" onPress={() => router.push(`/reservation/edit/${r.id}`)} />
          {open && (
            <Button small variant="danger" title="Ακύρωση κράτησης" loading={action.pending}
              onPress={() => confirm("Ακύρωση κράτησης;", "Οι ανοιχτές εργασίες της διαμονής θα ακυρωθούν.", "Ακύρωση κράτησης", () =>
                void action.run(() => api(`/api/reservations/${r.id}/cancel`, { method: "POST" }), { onSuccess: () => void reload() }))} />
          )}
        </View>
      </Card>

      <TaxCard tax={data.tax} reservationId={r.id} onChange={reload} />

      <Card>
        <SectionTitle title="Εργασίες" count={data.tasks.length}
          right={<Button small variant="ghost" title="+ Προσθήκη" onPress={() => router.push({ pathname: "/task/new", params: { propertyId: r.propertyId, reservationId: r.id } })} />} />
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
            <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              {original !== null && <Button small variant="ghost" title="Αρχικό" onPress={() => { setMessage(original); setOriginal(null); }} />}
              <Button small variant="outline" title="Μετάφραση" loading={translating} disabled={!message.trim()} onPress={translate} />
              <Button small title="Αποστολή" loading={sending} disabled={!message.trim()} onPress={send} />
            </View>
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

function TaxCard({ tax, reservationId, onChange }: { tax: StayTax; reservationId: string; onChange: () => void }) {
  const { run, pending } = useMutation();
  const setStatus = (status: StayTax["declaration"]["status"]) =>
    run(() => api(`/api/reservations/${reservationId}/declaration`, { body: { status } }), { onSuccess: onChange });
  const row = (label: string, value: string) => (
    <View style={[styles.row, { paddingVertical: 8 }]}>
      <Text style={[styles.rowSub, { flex: 1, marginTop: 0 }]}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: "600" }}>{value}</Text>
    </View>
  );
  return (
    <Card>
      <SectionTitle title="Φορολογικά & ΑΑΔΕ" />
      <Text style={styles.rowSub}>{tax.ama ? `ΑΜΑ ${tax.ama}` : "Το ακίνητο δεν έχει ΑΜΑ"}</Text>
      {tax.complimentary ? (
        <Text style={[styles.rowSub, { marginTop: 8 }]}>Δωρεάν φιλοξενία: δεν είναι μίσθωση — χωρίς έσοδο, ΤΑΚΚ και δήλωση διαμονής.</Text>
      ) : (
        <>
          {row("ΤΑΚΚ (τέλος ανθεκτικότητας)", formatMoney(tax.climateFee))}
          {tax.climateFeeMonths.length > 1 && tax.climateFeeMonths.map((m) => row(`  ${m.period} · ${m.nights} νύχτες`, formatMoney(m.amount)))}
          {tax.regime === "BUSINESS" && (
            <>
              {row("Μίσθωμα χωρίς ΦΠΑ", formatMoney(tax.rent))}
              {row("ΦΠΑ 13%", formatMoney(tax.vat))}
              {row("Τέλος παρεπιδημούντων 0,5%", formatMoney(tax.presenceFee))}
            </>
          )}
          {tax.longStay ? (
            <Text style={[styles.rowSub, { marginTop: 8 }]}>60+ νύχτες: δεν είναι βραχυχρόνια μίσθωση — δηλώνεται ως κανονική μίσθωση.</Text>
          ) : tax.declaration.required ? (
            <View style={[styles.row, { flexWrap: "wrap" }]}>
              <View style={{ flex: 1, minWidth: 140 }}>
                <Text style={styles.rowSub}>Δήλωση διαμονής</Text>
                {tax.declaration.status === "DECLARED" ? (
                  <Badge label="Δηλώθηκε" tone="success" />
                ) : (
                  <Badge label={`${tax.declaration.overdue ? "Εκπρόθεσμη · " : "Έως "}${formatDay(tax.declaration.deadline, false)}`} tone={tax.declaration.overdue ? "danger" : "neutral"} />
                )}
              </View>
              {tax.declaration.status === "DECLARED" ? (
                <Button small variant="ghost" title="Αναίρεση" loading={pending} onPress={() => setStatus("PENDING")} />
              ) : tax.declaration.due ? (
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <Button small variant="ghost" title="Δεν απαιτείται" loading={pending} onPress={() => setStatus("NOT_REQUIRED")} />
                  <Button small variant="outline" title="Δηλώθηκε" loading={pending} onPress={() => setStatus("DECLARED")} />
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={[styles.rowSub, { marginTop: 8 }]}>Δεν απαιτείται δήλωση διαμονής.</Text>
          )}
        </>
      )}
    </Card>
  );
}
