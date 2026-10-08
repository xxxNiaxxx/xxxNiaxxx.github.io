import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { Alert, Linking, Pressable, Text, TextInput, View } from "react-native";
import { Badge, Button, Card, ErrorBox, Loading, Screen, SectionTitle, statusTone, styles } from "@/components/ui";
import { AADE_PORTAL_URL } from "@/lib/aade";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, formatDay, formatMoney, humanize } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { Message, Reservation, StayTax, Task } from "@/lib/types";
import { confirm, notify, useMutation } from "@/lib/use-mutation";
import { useQuery } from "@/lib/use-query";
import { colors } from "@/theme";

interface Details {
  reservation: Reservation;
  tasks: Task[];
  messages: Message[];
  tax: StayTax;
  platform: { source: string | null; importedAt: string | null; fields: { label: string; value: string }[] } | null;
  /** Possible double bookings: a platform calendar shows another stay on these dates. */
  conflicts?: {
    id: string; sourceLabel: string; code: string | null; startLabel: string; endLabel: string;
    overlaps: { id: string; guestName: string; sourceLabel: string; checkInLabel: string; checkOutLabel: string }[];
  }[];
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
      {(data.conflicts ?? []).map((c) => (
        <Card key={c.id} style={{ borderColor: colors.danger, backgroundColor: colors.dangerSoft, gap: 6 }}>
          <Text style={{ color: colors.danger, fontWeight: "700" }}>Πιθανή διπλοκράτηση</Text>
          <Text style={{ color: colors.text }}>
            Το ημερολόγιο {c.sourceLabel} δείχνει κράτηση {c.startLabel} – {c.endLabel}{c.code ? ` (${c.code})` : ""} πάνω σε:{" "}
            {c.overlaps.map((o) => `${o.guestName} (${o.sourceLabel} ${o.checkInLabel}–${o.checkOutLabel})`).join(", ")}.
          </Text>
          <Text style={styles.rowSub}>Ελέγξτε τις κρατήσεις στις πλατφόρμες· αν είναι διπλοκράτηση, επικοινωνήστε άμεσα με τον έναν επισκέπτη.</Text>
          <Button small variant="outline" title="Δεν είναι διπλοκράτηση" loading={action.pending} style={{ alignSelf: "flex-start" }}
            onPress={() => void action.run(() => api(`/api/calendar-conflicts/${c.id}/dismiss`, { method: "POST" }), { onSuccess: () => void reload() })} />
        </Card>
      ))}
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
          {r.status === "PENDING" && (
            <Button small title="Επιβεβαίωση" loading={action.pending}
              onPress={() => void action.run(() => api(`/api/reservations/${r.id}`, { method: "PATCH", body: { status: "CONFIRMED" } }), { onSuccess: () => void reload() })} />
          )}
          {open && (
            <Button small variant="danger" title="Ακύρωση κράτησης" loading={action.pending}
              onPress={() => confirm("Ακύρωση κράτησης;", "Οι ανοιχτές εργασίες της διαμονής θα ακυρωθούν.", "Ακύρωση κράτησης", () =>
                void action.run(() => api(`/api/reservations/${r.id}/cancel`, { method: "POST" }), { onSuccess: () => void reload() }))} />
          )}
        </View>
      </Card>

      {data.platform && (
        <Card>
          <SectionTitle title={`Στοιχεία από ${humanize(data.platform.source ?? r.source)}`} />
          {data.platform.fields.map((f, i) => (
            <View key={`${f.label}-${i}`} style={[styles.row, { paddingVertical: 8, alignItems: "flex-start" }]}>
              <Text style={[styles.rowSub, { width: 130, marginTop: 0 }]}>{f.label}</Text>
              <Text style={{ flex: 1, color: colors.text }} selectable>{f.value}</Text>
            </View>
          ))}
        </Card>
      )}

      <TaxCard tax={data.tax} reservationId={r.id} onChange={reload} />
      {!data.tax.complimentary && !data.tax.longStay && data.tax.declaration.required && (
        <DeclarationCard tax={data.tax} reservationId={r.id} guestId={r.guestId} onChange={reload} />
      )}

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

      {(open || r.status === "COMPLETED") && !r.complimentary && <CheckinCard reservation={r} />}
      <ReplyCard reservationId={r.id} guestId={r.guestId} onSaved={reload} />

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
  const row = (label: string, value: string, strong?: boolean) => (
    <View key={label} style={[styles.row, { paddingVertical: 8 }]}>
      <Text style={[styles.rowSub, { flex: 1, marginTop: 0 }, strong && { color: colors.text, fontWeight: "700" }]}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: strong ? "700" : "500" }}>{value}</Text>
    </View>
  );
  return (
    <Card>
      <SectionTitle title="Ανάλυση τιμής & φόροι" />
      <Text style={styles.rowSub}>{tax.ama ? `ΑΜΑ ${tax.ama}` : "Το ακίνητο δεν έχει ΑΜΑ"}</Text>
      {tax.complimentary ? (
        <Text style={[styles.rowSub, { marginTop: 8 }]}>Δωρεάν φιλοξενία: δεν είναι μίσθωση — χωρίς έσοδο, ΤΑΚΚ και δήλωση διαμονής.</Text>
      ) : (
        <>
          {row("Τιμή δωματίου", formatMoney(tax.totalAmount))}
          {row(`ΤΑΚΚ${tax.climateFeeMonths.length > 1 ? ` (${tax.climateFeeMonths.map((m) => `${m.period}: ${formatMoney(m.amount)}`).join(", ")})` : ""}`, formatMoney(tax.climateFee))}
          {row("Πληρωμή επισκέπτη", formatMoney(tax.guestTotal), true)}
          {row("− ΤΑΚΚ (αποδίδεται στην ΑΑΔΕ)", formatMoney(tax.climateFee))}
          {tax.regime === "BUSINESS" && (
            <>
              {row("− ΦΠΑ 13%", formatMoney(tax.vat))}
              {row("− Τέλος παρεπιδημούντων 0,5%", formatMoney(tax.presenceFee))}
            </>
          )}
          {row(`− Προμήθεια${tax.commissionRate ? ` (${tax.commissionRate}%)` : ""}`, formatMoney(tax.commission))}
          {row(`− Φόρος εισοδήματος (εκτίμηση${tax.incomeTaxRate !== null ? ` ${Math.round(tax.incomeTaxRate * 1000) / 10}%` : ""})`, tax.incomeTax === null ? "—" : formatMoney(tax.incomeTax))}
          {row("Καθαρά στον ιδιοκτήτη", tax.net === null ? "—" : formatMoney(tax.net), true)}
          {tax.longStay ? (
            <Text style={[styles.rowSub, { marginTop: 8 }]}>60+ νύχτες: δεν είναι βραχυχρόνια μίσθωση — δηλώνεται ως κανονική μίσθωση.</Text>
          ) : tax.declaration.required ? (
            <Text style={[styles.rowSub, { marginTop: 8 }]}>Τα στοιχεία της δήλωσης διαμονής είναι στην κάρτα «Δήλωση στο Μητρώο ΑΑΔΕ».</Text>
          ) : (
            <Text style={[styles.rowSub, { marginTop: 8 }]}>Δεν απαιτείται δήλωση διαμονής.</Text>
          )}
        </>
      )}
    </Card>
  );
}

/** The AADE stay declaration ready to copy, field by field, into myAADE. */
function DeclarationCard({ tax, reservationId, guestId, onChange }: { tax: StayTax; reservationId: string; guestId: string; onChange: () => void }) {
  const { run, pending } = useMutation();
  const setStatus = (status: StayTax["declaration"]["status"]) =>
    run(() => api(`/api/reservations/${reservationId}/declaration`, { body: { status } }), { onSuccess: onChange });
  const copy = async (text: string, what: string) => {
    await Clipboard.setStringAsync(text);
    notify(`Αντιγράφηκε: ${what}`);
  };
  const form = tax.declarationForm;
  const declared = tax.declaration.status === "DECLARED";
  return (
    <Card>
      <SectionTitle title="Δήλωση στο Μητρώο ΑΑΔΕ" />
      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
        {declared ? (
          <Badge label="Δηλώθηκε" tone="success" />
        ) : (
          <Badge label={`${tax.declaration.overdue ? "Εκπρόθεσμη · " : "Προθεσμία "}${formatDay(tax.declaration.deadline, false)}`} tone={tax.declaration.overdue ? "danger" : "neutral"} />
        )}
        {form.cancelled && <Badge label="Ακύρωση με χρέωση" tone="warning" />}
      </View>
      {form.fields.map((f, i) => (
        <Pressable key={f.key} disabled={!f.value} onPress={() => f.value && void copy(f.value, f.label)}
          style={({ pressed }) => [styles.row, i === 0 && { borderTopWidth: 0 }, pressed && { opacity: 0.6 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowSub}>{f.label}</Text>
            {f.value ? (
              <Text style={styles.rowTitle}>{f.value}{f.key === "paymentMethod" && form.paymentMethodIsDefault ? " (προεπιλογή)" : ""}</Text>
            ) : f.optional ? (
              <Text style={styles.rowSub}>— (χωρίς αριθμό κράτησης)</Text>
            ) : (
              <Text style={{ color: colors.warning }}>
                Λείπει{["guestName", "idNumber"].includes(f.key) ? " · συμπληρώστε στον επισκέπτη" : ["bookingNumber", "paymentMethod"].includes(f.key) ? " · από την επεξεργασία της κράτησης" : ""}
              </Text>
            )}
          </View>
          {f.value ? <Ionicons name="copy-outline" size={18} color={colors.accent} /> : null}
        </Pressable>
      ))}
      <Text style={[styles.rowSub, { marginTop: 4 }]}>Πατήστε ένα στοιχείο για αντιγραφή.</Text>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        {form.missing.some((m) => m.includes("διαβατηρίου")) && (
          <Button small variant="outline" title="Στοιχεία επισκέπτη" onPress={() => router.push(`/guest/edit/${guestId}`)} />
        )}
        <Button small variant="outline" title="Άνοιγμα myAADE" onPress={() => Linking.openURL(AADE_PORTAL_URL)} />
        {declared ? (
          <Button small variant="ghost" title="Αναίρεση" loading={pending} onPress={() => setStatus("PENDING")} />
        ) : tax.declaration.due ? (
          <>
            <Button small variant="ghost" title="Δεν απαιτείται" loading={pending} onPress={() => setStatus("NOT_REQUIRED")} />
            <Button small title="Το υπέβαλα" loading={pending} onPress={() => setStatus("DECLARED")} />
          </>
        ) : null}
      </View>
    </Card>
  );
}

/** Paste a guest's message from Airbnb/Booking/email; the assistant drafts the reply to copy back. */
function ReplyCard({ reservationId, guestId, onSaved }: { reservationId: string; guestId: string; onSaved: () => void }) {
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<{ reply: string; offline: boolean; usedInfo: number; conversationUrl: string | null } | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const save = useMutation();

  async function generate() {
    setBusy(true);
    try {
      const d = await api<NonNullable<typeof draft>>("/api/ai/reply", { body: { reservationId, guestMessage: message } });
      setDraft(d);
      setReply(d.reply);
    } catch (e) {
      Alert.alert("Δεν ετοιμάστηκε απάντηση", e instanceof ApiError ? e.message : "Δοκιμάστε ξανά.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ gap: 8 }}>
      <SectionTitle title="Απάντηση σε μήνυμα επισκέπτη" />
      <TextInput value={message} onChangeText={setMessage} multiline placeholder="Επικολλήστε το μήνυμα του επισκέπτη από Airbnb, Booking ή email…"
        placeholderTextColor={colors.subtleText} style={[styles.input, { height: 80, paddingTop: 10, textAlignVertical: "top" }]} />
      <Button small title="Γράψε απάντηση" loading={busy} disabled={message.trim().length < 2} onPress={generate} style={{ alignSelf: "flex-start" }} />
      {draft && (
        <>
          <TextInput value={reply} onChangeText={setReply} multiline
            style={[styles.input, { height: 180, paddingTop: 10, textAlignVertical: "top" }]} />
          <Text style={styles.rowSub}>
            {draft.offline
              ? draft.usedInfo ? "Από τις σημειώσεις του καταλύματος. Ελέγξτε την πριν τη στείλετε." : "Δεν βρέθηκε σημείωση για το θέμα — η απάντηση λέει ότι θα το ελέγξετε."
              : "Από τον βοηθό AI. Ελέγξτε την πριν τη στείλετε."}{" "}
            Τα στοιχεία του καταλύματος (Wi-Fi, πάρκινγκ…) τα μαθαίνει από τις Γνώσεις.
          </Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Button small title="Αντιγραφή" onPress={async () => { await Clipboard.setStringAsync(reply); notify("Αντιγράφηκε"); }} />
            {draft.conversationUrl && <Button small variant="outline" title="Άνοιγμα συνομιλίας" onPress={() => Linking.openURL(draft.conversationUrl!)} />}
            <Button small variant="ghost" title="Καταγραφή ως σταλμένο" loading={save.pending}
              onPress={() => void save.run(() => api("/api/messages", { body: { guestId, reservationId, content: reply, send: true } }), {
                onSuccess: () => { setDraft(null); setMessage(""); setReply(""); onSaved(); },
              })} />
          </View>
        </>
      )}
    </Card>
  );
}

const INVITE: Record<string, (name: string, url: string) => string> = {
  el: (n, u) => `Γεια σας ${n}! Για να είναι όλα έτοιμα για την άφιξή σας, ολοκληρώστε το online check-in (1 λεπτό): ${u}`,
  en: (n, u) => `Hi ${n}! To have everything ready for your arrival, please complete your online check-in (1 minute): ${u}`,
  de: (n, u) => `Hallo ${n}! Damit bei Ihrer Ankunft alles bereit ist, schließen Sie bitte den Online-Check-in ab (1 Minute): ${u}`,
  fr: (n, u) => `Bonjour ${n} ! Pour que tout soit prêt à votre arrivée, merci de compléter votre check-in en ligne (1 minute) : ${u}`,
  it: (n, u) => `Ciao ${n}! Per avere tutto pronto al tuo arrivo, completa il check-in online (1 minuto): ${u}`,
  es: (n, u) => `¡Hola ${n}! Para tenerlo todo listo a tu llegada, completa el check-in online (1 minuto): ${u}`,
};

/** Online check-in: the guest fills in ΑΦΜ/passport, phone, arrival time and accepts the house rules. */
function CheckinCard({ reservation: r }: { reservation: Reservation }) {
  const { serverUrl } = useSession();
  const guest = useQuery<{ guest: { firstName: string; language: string } }>(`/api/guests/${r.guestId}`);
  const [path, setPath] = useState(r.checkinPath);
  const { run, pending } = useMutation();
  const url = path ? `${serverUrl}${path}` : null;
  const firstName = guest.data?.guest.firstName ?? "";
  const lang = guest.data?.guest.language ?? "en";
  return (
    <Card style={{ gap: 8 }}>
      <SectionTitle title="Online check-in" />
      {r.checkinCompletedAt ? (
        <Text style={{ color: colors.success }}>
          Ολοκληρώθηκε {formatDateTime(r.checkinCompletedAt)}{r.arrivalTime ? ` · άφιξη ${r.arrivalTime}` : ""}{r.rulesAccepted ? " · αποδέχτηκε τους κανόνες" : ""}
        </Text>
      ) : url ? (
        <>
          <Text style={styles.rowSub} numberOfLines={1}>{url}</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Button small title="Αντιγραφή μηνύματος" onPress={async () => { await Clipboard.setStringAsync((INVITE[lang] ?? INVITE.en)(firstName, url)); notify("Αντιγράφηκε"); }} />
            <Button small variant="outline" title="Μόνο ο σύνδεσμος" onPress={async () => { await Clipboard.setStringAsync(url); notify("Αντιγράφηκε"); }} />
          </View>
        </>
      ) : (
        <>
          <Text style={styles.rowSub}>Ο επισκέπτης συμπληρώνει μόνος του ΑΦΜ ή διαβατήριο, τηλέφωνο και ώρα άφιξης, στη γλώσσα του.</Text>
          <Button small title="Δημιουργία συνδέσμου" loading={pending} style={{ alignSelf: "flex-start" }}
            onPress={() => void run(() => api<{ path: string }>(`/api/reservations/${r.id}/checkin-link`, { method: "POST" }), { onSuccess: (x) => setPath(x.path) })} />
        </>
      )}
    </Card>
  );
}
