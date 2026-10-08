import { useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, humanize } from "@/lib/format";
import type { AIAction } from "@/lib/types";
import { colors } from "@/theme";
import { Badge, Button, Card, statusTone, styles } from "./ui";

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** A proposed AI action. Nothing happens until the user taps Approve. */
export function ActionCard({ action, onChange }: { action: AIAction; onChange: (a: AIAction) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(str(action.payload.message));
  const p = action.payload;
  const isMessage = action.type === "SEND_GUEST_MESSAGE";
  const proposed = action.status === "PROPOSED";

  async function call(kind: string, path: string, body?: unknown) {
    setBusy(kind);
    try {
      onChange(await api<AIAction>(`/api/ai/actions/${action.id}${path}`, { method: body ? "PATCH" : "POST", body }));
      setEditing(false);
    } catch (e) {
      Alert.alert("Η ενέργεια απέτυχε", e instanceof ApiError ? e.message : "Δοκιμάστε ξανά.");
    } finally {
      setBusy(null);
    }
  }

  const statusLabel = action.status === "EXECUTED" ? (isMessage ? "Στάλθηκε" : "Δημιουργήθηκε") : humanize(action.status);

  return (
    <Card style={{ borderColor: proposed ? "#FCD34D" : colors.border, borderWidth: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <Text style={{ fontWeight: "700", color: colors.text }}>{proposed ? (isMessage ? "Έτοιμο για αποστολή" : "Έτοιμο για δημιουργία") : isMessage ? "Μήνυμα σε επισκέπτη" : "Εργασία"}</Text>
        <Badge label={statusLabel} tone={statusTone[action.status]} />
      </View>
      {isMessage ? (
        <>
          <Text style={styles.rowSub}>
            Προς <Text style={{ color: colors.text, fontWeight: "600" }}>{str(p.guestName)}</Text>
            {str(p.context) ? ` · ${str(p.context)}` : ""}
          </Text>
          {editing ? (
            <TextInput value={draft} onChangeText={setDraft} multiline style={[styles.input, { height: 160, marginTop: 8, paddingTop: 10, textAlignVertical: "top" }]} />
          ) : (
            <Text style={{ marginTop: 8, backgroundColor: colors.muted, padding: 12, borderRadius: 10, color: colors.text, lineHeight: 20 }}>{str(p.message)}</Text>
          )}
        </>
      ) : (
        <>
          <Text style={styles.rowTitle}>{str(p.title)}</Text>
          <Text style={styles.rowSub}>
            {[str(p.propertyName), humanize(str(p.type) || "OTHER"), str(p.dueAt) && `έως ${formatDateTime(str(p.dueAt))}`].filter(Boolean).join(" · ")}
          </Text>
        </>
      )}
      {action.status === "FAILED" && <Text style={{ color: colors.danger, marginTop: 8 }}>{str(action.result?.error) || "Η ενέργεια απέτυχε."}</Text>}
      {action.status === "EXECUTED" && isMessage && <Text style={[styles.rowSub, { marginTop: 8 }]}>Καταγράφηκε ως σταλμένο (προσομοίωση στη Φάση 1).</Text>}
      {proposed && (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
          {editing ? (
            <>
              <Button small variant="ghost" title="Απόρριψη" onPress={() => { setEditing(false); setDraft(str(p.message)); }} />
              <Button small variant="outline" title="Αποθήκευση" loading={busy === "save"} disabled={!draft.trim()} onPress={() => call("save", "", { message: draft })} />
            </>
          ) : (
            <>
              <Button small variant="ghost" title="Ακύρωση" loading={busy === "reject"} onPress={() => call("reject", "/reject")} />
              {isMessage && <Button small variant="outline" title="Επεξεργασία" onPress={() => setEditing(true)} />}
              <Button small variant="accent" title="Έγκριση" loading={busy === "approve"} onPress={() => call("approve", "/approve")} />
            </>
          )}
        </View>
      )}
    </Card>
  );
}
