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
      Alert.alert("Action failed", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const statusLabel = action.status === "EXECUTED" ? (isMessage ? "Sent" : "Created") : humanize(action.status);

  return (
    <Card style={{ borderColor: proposed ? "#FCD34D" : colors.border, borderWidth: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <Text style={{ fontWeight: "700", color: colors.text }}>{proposed ? (isMessage ? "Ready to send" : "Ready to create") : isMessage ? "Guest message" : "Task"}</Text>
        <Badge label={statusLabel} tone={statusTone[action.status]} />
      </View>
      {isMessage ? (
        <>
          <Text style={styles.rowSub}>
            To <Text style={{ color: colors.text, fontWeight: "600" }}>{str(p.guestName)}</Text>
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
            {[str(p.propertyName), humanize(str(p.type) || "OTHER"), str(p.dueAt) && `due ${formatDateTime(str(p.dueAt))}`].filter(Boolean).join(" · ")}
          </Text>
        </>
      )}
      {action.status === "FAILED" && <Text style={{ color: colors.danger, marginTop: 8 }}>{str(action.result?.error) || "The action failed."}</Text>}
      {action.status === "EXECUTED" && isMessage && <Text style={[styles.rowSub, { marginTop: 8 }]}>Recorded as sent (simulated in Phase 1).</Text>}
      {proposed && (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
          {editing ? (
            <>
              <Button small variant="ghost" title="Discard" onPress={() => { setEditing(false); setDraft(str(p.message)); }} />
              <Button small variant="outline" title="Save" loading={busy === "save"} disabled={!draft.trim()} onPress={() => call("save", "", { message: draft })} />
            </>
          ) : (
            <>
              <Button small variant="ghost" title="Cancel" loading={busy === "reject"} onPress={() => call("reject", "/reject")} />
              {isMessage && <Button small variant="outline" title="Edit" onPress={() => setEditing(true)} />}
              <Button small variant="accent" title="Approve" loading={busy === "approve"} onPress={() => call("approve", "/approve")} />
            </>
          )}
        </View>
      )}
    </Card>
  );
}
