import { Stack } from "expo-router";
import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SelectField, TextField } from "@/components/form";
import { Badge, Button, Card, ErrorBox, Loading, Screen, SectionTitle, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { GUEST_LANGUAGES, languageName, MEMORY_KIND_LABELS, MESSAGE_KIND_LABELS } from "@/lib/constants";
import type { Memory, Property } from "@/lib/types";
import { confirm, useMutation } from "@/lib/use-mutation";
import { useQuery } from "@/lib/use-query";
import { colors } from "@/theme";

const SOURCE_LABELS: Record<string, string> = { MANUAL: "Χειροκίνητα", CHAT: "Από τη συνομιλία", EDIT: "Από διόρθωση" };

export default function Knowledge() {
  const memories = useQuery<Memory[]>("/api/ai/memories");
  const properties = useQuery<Property[]>("/api/properties");
  const { run, pending, fieldErrors: err } = useMutation();
  const [kind, setKind] = useState<Memory["kind"]>("GUEST_INFO");
  const [propertyId, setPropertyId] = useState("");
  const [language, setLanguage] = useState("");
  const [messageKind, setMessageKind] = useState("checkin");
  const [content, setContent] = useState("");

  async function add() {
    await run(
      () => api("/api/ai/memories", { body: { kind, content, propertyId, language, ...(kind === "MESSAGE_TEMPLATE" ? { messageKind } : {}) } }),
      { onSuccess: () => { setContent(""); void memories.reload(); } },
    );
  }

  const groups = (Object.keys(MEMORY_KIND_LABELS) as Memory["kind"][]).map((k) => ({ kind: k, items: (memories.data ?? []).filter((m) => m.kind === k) }));

  return (
    <Screen refreshing={memories.refreshing} onRefresh={memories.reload}>
      <Stack.Screen options={{ title: "Γνώσεις του βοηθού" }} />
      <Text style={styles.rowSub}>Ο βοηθός χρησιμοποιεί αυτές τις πληροφορίες στις απαντήσεις και στα μηνύματα προς τους επισκέπτες. Μαθαίνει και όταν διορθώνετε τα μηνύματά του.</Text>
      <Card style={{ gap: 12 }}>
        <SectionTitle title="Νέα γνώση" />
        <SelectField label="Τύπος" value={kind} onChange={(v) => setKind(v as Memory["kind"])} options={Object.entries(MEMORY_KIND_LABELS).map(([value, label]) => ({ value, label }))} />
        <SelectField label="Ακίνητο" value={propertyId} onChange={setPropertyId} options={[{ value: "", label: "Όλα τα ακίνητα" }, ...(properties.data ?? []).map((p) => ({ value: p.id, label: p.name }))]} />
        {kind !== "PREFERENCE" && (
          <SelectField label="Γλώσσα" value={language} onChange={setLanguage} options={[{ value: "", label: "Όλες οι γλώσσες" }, ...GUEST_LANGUAGES.map((l) => ({ value: l.code, label: l.name }))]} />
        )}
        {kind === "MESSAGE_TEMPLATE" && (
          <SelectField label="Είδος μηνύματος" value={messageKind} onChange={setMessageKind} options={Object.entries(MESSAGE_KIND_LABELS).map(([value, label]) => ({ value, label }))} />
        )}
        <TextField label="Τι να μάθει ο βοηθός" value={content} onChangeText={setContent} multiline error={err.content}
          placeholder={kind === "GUEST_INFO" ? "π.χ. Wi-Fi: VillaElia — κωδικός elia2026" : kind === "PREFERENCE" ? "π.χ. Οι καθαρισμοί γίνονται μετά τις 11:00" : "Γεια σας {name}! Η άφιξη στο {property} είναι στις {checkIn}…"} />
        <Button title="Προσθήκη" loading={pending} disabled={content.trim().length < 3} onPress={add} />
      </Card>
      {memories.error && <ErrorBox message={memories.error} onRetry={memories.reload} />}
      {!memories.data ? <Loading /> : groups.map((g) => (
        <Card key={g.kind}>
          <SectionTitle title={MEMORY_KIND_LABELS[g.kind]} count={g.items.length} />
          {g.items.length === 0 && <Text style={styles.rowSub}>Τίποτα ακόμη.</Text>}
          {g.items.map((m) => (
            <MemoryRow key={m.id} memory={m} onChange={memories.reload} />
          ))}
        </Card>
      ))}
    </Screen>
  );
}

function MemoryRow({ memory: m, onChange }: { memory: Memory; onChange: () => void }) {
  const { run } = useMutation();
  return (
    <View style={[styles.row, { alignItems: "flex-start" }]}>
      <View style={{ flex: 1, opacity: m.active ? 1 : 0.5 }}>
        <Text style={{ color: colors.text }}>{m.content}</Text>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          <Badge label={m.propertyName ?? "Όλα τα ακίνητα"} />
          {m.language && <Badge label={languageName(m.language)} tone="info" />}
          {m.messageKind && <Badge label={MESSAGE_KIND_LABELS[m.messageKind] ?? m.messageKind} tone="accent" />}
          <Text style={styles.rowSub}>{SOURCE_LABELS[m.source]}</Text>
        </View>
      </View>
      <View style={{ alignItems: "center", gap: 8 }}>
        <Switch value={m.active} onValueChange={(active) => void run(() => api(`/api/ai/memories/${m.id}`, { method: "PATCH", body: { active } }), { onSuccess: onChange })}
          trackColor={{ true: colors.accent, false: colors.border }} accessibilityLabel="Ενεργή" />
        <Pressable hitSlop={10} accessibilityLabel="Διαγραφή"
          onPress={() => confirm("Διαγραφή γνώσης;", m.content, "Διαγραφή", () => void run(() => api(`/api/ai/memories/${m.id}`, { method: "DELETE" }), { onSuccess: onChange }))}>
          <Ionicons name="trash-outline" size={18} color={colors.mutedText} />
        </Pressable>
      </View>
    </View>
  );
}
