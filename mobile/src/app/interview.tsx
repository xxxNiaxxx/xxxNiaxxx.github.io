import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { CheckRow, SelectField, TextField } from "@/components/form";
import { Badge, Button, Card, Empty, ErrorBox, Loading, Screen, SectionTitle, styles } from "@/components/ui";
import { api } from "@/lib/api";
import type { InterviewState, Property } from "@/lib/types";
import { notify, useMutation } from "@/lib/use-mutation";
import { useQuery } from "@/lib/use-query";
import { colors } from "@/theme";

type Suggestion = { key: string; label: string; question: string; answer: string; use: boolean };

/** The assistant asks the important questions about a property, or reads them from its Booking.com / Airbnb page. */
export default function Interview() {
  const params = useLocalSearchParams<{ property?: string }>();
  const properties = useQuery<Property[]>("/api/properties");
  const [propertyId, setPropertyId] = useState(params.property ?? "");
  useEffect(() => {
    if (!propertyId && properties.data?.length) setPropertyId(properties.data[0].id);
  }, [properties.data, propertyId]);
  const state = useQuery<InterviewState>(propertyId ? `/api/ai/interview?propertyId=${propertyId}` : null);
  const { run, pending, fieldErrors: err } = useMutation();
  const [editing, setEditing] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<{ topic: string; question: string } | null>(null);
  const [answer, setAnswer] = useState("");
  const s = state.data;
  const current = s && (followUp ? s.answers.find((a) => a.key === followUp.topic) : editing ? s.answers.find((a) => a.key === editing) : s.next);

  const reset = () => {
    setAnswer("");
    setEditing(null);
  };
  const post = <T,>(body: Record<string, unknown>) => api<T>("/api/ai/interview", { body: { propertyId, ...body } });

  async function submit() {
    if (!current) return;
    await run(() => post<{ followUp: string | null }>({ action: "answer", topic: current.key, answer, followUp: followUp?.question }), {
      onSuccess: (r) => {
        reset();
        setFollowUp(r.followUp ? { topic: current.key, question: r.followUp } : null);
        void state.reload();
      },
    });
  }

  async function skip() {
    if (!current) return;
    if (followUp) {
      setFollowUp(null);
      reset();
      return;
    }
    await run(() => post({ action: "skip", topic: current.key }), { onSuccess: () => { reset(); void state.reload(); } });
  }

  if (properties.data && !properties.data.length) return <Screen><Empty title="Προσθέστε πρώτα ένα ακίνητο" /></Screen>;

  return (
    <Screen refreshing={state.refreshing} onRefresh={state.reload}>
      <Stack.Screen options={{ title: "Ο βοηθός σάς ρωτά" }} />
      <Text style={styles.rowSub}>Απαντήστε σε λίγες ερωτήσεις, ή αφήστε τον βοηθό να τις βρει στη σελίδα σας στο Booking.com / Airbnb. Οι απαντήσεις μπαίνουν στα μηνύματα προς τους επισκέπτες και στον οδηγό επισκέπτη.</Text>
      {(properties.data?.length ?? 0) > 1 && (
        <SelectField label="Κατάλυμα" value={propertyId} onChange={(v) => { setFollowUp(null); reset(); setPropertyId(v); }} options={(properties.data ?? []).map((p) => ({ value: p.id, label: p.name }))} />
      )}
      {state.error && <ErrorBox message={state.error} onRetry={state.reload} />}
      {!s ? <Loading /> : (
        <>
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={styles.rowSub}>Πρόοδος</Text>
              <Text style={{ color: colors.text, fontWeight: "600" }}>{s.answered} από {s.total}</Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: "hidden" }}>
              <View style={{ height: 8, width: `${Math.round((s.answered / s.total) * 100)}%`, backgroundColor: colors.accent }} />
            </View>
            {current ? (
              <View style={{ gap: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>{followUp ? followUp.question : current.question}</Text>
                {followUp
                  ? <Text style={styles.rowSub}>Διευκρίνιση για «{current.label}» — προστίθεται στην απάντησή σας.</Text>
                  : current.hint ? <Text style={styles.rowSub}>{current.hint}</Text> : null}
                <TextField label="Η απάντησή σας" value={answer} onChangeText={setAnswer} multiline error={err.answer}
                  placeholder={current.key === "checkInTime" || current.key === "checkOutTime" ? "π.χ. 15:00" : "Όπως θα το λέγατε στον επισκέπτη…"} />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Button title={followUp ? "Δεν χρειάζεται" : editing ? "Ακύρωση" : "Παράλειψη"} variant="outline" style={{ flex: 1 }} onPress={() => (editing && !followUp ? reset() : void skip())} />
                  <Button title="Αποθήκευση" loading={pending} disabled={!answer.trim()} style={{ flex: 1 }} onPress={submit} />
                </View>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <Text style={{ color: colors.text }}>Τελειώσαμε! Ο βοηθός ξέρει ό,τι χρειάζεται για το «{s.property.name}».</Text>
                {s.answers.some((a) => a.status === "skipped") && (
                  <Button title="Ρώτα ξανά όσα παρέλειψα" variant="outline" onPress={() => void run(() => post({ action: "reset" }), { onSuccess: () => void state.reload() })} />
                )}
              </View>
            )}
          </Card>

          <ListingImport propertyId={propertyId} answered={new Set(s.answers.filter((a) => a.answer).map((a) => a.key))} onSaved={state.reload} />

          <Card>
            <SectionTitle title="Οι απαντήσεις σας" />
            {s.answers.map((a) => (
              <View key={a.key} style={[styles.row, { alignItems: "flex-start" }]}>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <Text style={styles.rowTitle}>{a.label}</Text>
                    {a.status === "skipped" && <Badge label="Παραλείφθηκε" />}
                    {a.status === "open" && <Badge label="Χωρίς απάντηση" tone="warning" />}
                  </View>
                  {a.answer ? <Text style={styles.rowSub}>{a.answer}</Text> : null}
                </View>
                <Button small variant="ghost" title={a.answer ? "Αλλαγή" : "Απάντηση"} onPress={() => { setFollowUp(null); setEditing(a.key); setAnswer(a.answer ?? ""); }} />
              </View>
            ))}
          </Card>
          <Text style={styles.rowSub}>Μη γράφετε κωδικούς πόρτας ή συναγερμού: τους στέλνετε εσείς λίγο πριν την άφιξη.</Text>
        </>
      )}
    </Screen>
  );
}

function ListingImport({ propertyId, answered, onSaved }: { propertyId: string; answered: Set<string>; onSaved: () => void }) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [paste, setPaste] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const { run, pending, fieldErrors: err } = useMutation();

  const read = (body: { url?: string; text?: string }) =>
    run(() => api<{ readPage: boolean; suggestions: Omit<Suggestion, "use">[] }>("/api/ai/interview", { body: { action: "import", propertyId, ...body } }), {
      errorTitle: "Δεν διαβάστηκε",
      onSuccess: (r) => {
        if (!r.readPage) {
          setPaste(true);
          notify("Η σελίδα δεν διαβάστηκε", "Το Booking.com και το Airbnb συχνά δεν επιτρέπουν την αυτόματη ανάγνωση. Ανοίξτε τη σελίδα, επιλέξτε όλο το κείμενο, αντιγράψτε το και επικολλήστε το εδώ.");
          return;
        }
        if (!r.suggestions.length) notify("Δεν βρέθηκαν πληροφορίες", "Δοκιμάστε να επικολλήσετε το κείμενο ολόκληρης της σελίδας.");
        setSuggestions(r.suggestions.length ? r.suggestions.map((x) => ({ ...x, use: !answered.has(x.key) })) : null);
      },
    });

  const save = () =>
    run(() => api("/api/ai/interview", { body: { action: "apply", propertyId, answers: suggestions!.filter((x) => x.use && x.answer.trim()).map((x) => ({ topic: x.key, answer: x.answer })) } }), {
      onSuccess: () => {
        setSuggestions(null);
        setText("");
        onSaved();
      },
    });

  const update = (i: number, patch: Partial<Suggestion>) => setSuggestions(suggestions!.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <Card style={{ gap: 12 }}>
      <SectionTitle title="Από Booking.com ή Airbnb" />
      {suggestions ? (
        <>
          <Text style={styles.rowSub}>Ελέγξτε τις απαντήσεις πριν τις αποθηκεύσετε.</Text>
          {suggestions.map((x, i) => (
            <View key={x.key} style={{ gap: 4, opacity: x.use ? 1 : 0.6 }}>
              <CheckRow label={x.label} detail={answered.has(x.key) ? "Αντικαθιστά την απάντησή σας" : undefined} value={x.use} onChange={(use) => update(i, { use })} />
              <TextField label={x.label} value={x.answer} onChangeText={(answer) => update(i, { answer })} multiline />
            </View>
          ))}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button title="Ακύρωση" variant="outline" style={{ flex: 1 }} onPress={() => setSuggestions(null)} />
            <Button title="Αποθήκευση" loading={pending} disabled={!suggestions.some((x) => x.use)} style={{ flex: 1 }} onPress={save} />
          </View>
        </>
      ) : (
        <>
          <Text style={styles.rowSub}>Ο βοηθός διαβάζει τη σελίδα του καταλύματος και προτείνει απαντήσεις.</Text>
          <TextField label="Σύνδεσμος της σελίδας" value={url} onChangeText={setUrl} error={err.url} keyboardType="url" autoCapitalize="none" placeholder="https://www.booking.com/hotel/gr/…" />
          <Button title="Ανάγνωση" variant="outline" loading={pending && !paste} disabled={!url.trim()} onPress={() => void read({ url })} />
          {paste ? (
            <>
              <TextField label="Κείμενο της σελίδας" value={text} onChangeText={setText} multiline error={err.text}
                hint="Ανοίξτε τη σελίδα, «Επιλογή όλων», αντιγράψτε και επικολλήστε εδώ." />
              <Button title="Ανάγνωση κειμένου" variant="outline" loading={pending && paste} disabled={text.trim().length < 50} onPress={() => void read({ text })} />
            </>
          ) : (
            <Button title="ή επικολλήστε το κείμενο της σελίδας" variant="ghost" small onPress={() => setPaste(true)} />
          )}
        </>
      )}
    </Card>
  );
}
