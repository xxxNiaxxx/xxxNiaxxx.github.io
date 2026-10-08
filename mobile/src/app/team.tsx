import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack } from "expo-router";
import { useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { SelectField, TextField } from "@/components/form";
import { Badge, Button, Card, ErrorBox, Loading, Screen, SectionTitle, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDay, humanize } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { Invitation, Member } from "@/lib/types";
import { confirm, notify, useMutation } from "@/lib/use-mutation";
import { useQuery } from "@/lib/use-query";
import { colors } from "@/theme";

export default function Team() {
  const { session, serverUrl, refresh } = useSession();
  const members = useQuery<Member[]>("/api/members");
  const invitations = useQuery<Invitation[]>("/api/invitations");
  const { run, pending, fieldErrors: err } = useMutation();
  const action = useMutation();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [link, setLink] = useState<{ email: string; url: string } | null>(null);
  if (!session) return null;
  const me = session.user.id;
  const myRole = session.role;
  const canInvite = myRole === "OWNER" || myRole === "ADMIN";
  const reload = () => { void members.reload(); void invitations.reload(); };

  async function invite(target: { email: string; role: "MEMBER" | "ADMIN" }) {
    await run(() => api<{ path: string }>("/api/invitations", { body: target }), {
      onSuccess: (r) => {
        setLink({ email: target.email, url: `${serverUrl}${r.path}` });
        setEmail("");
        reload();
      },
    });
  }

  const share = (l: { email: string; url: string }) =>
    Share.share({ message: `Σας προσκαλώ στην ομάδα μου στο Βραχυχρόνια.ai: ${l.url}` }).catch(() => notify("Η κοινοποίηση δεν έγινε"));

  const canRemove = (m: Member) => m.role !== "OWNER" && m.userId !== me && (myRole === "OWNER" || (myRole === "ADMIN" && m.role === "MEMBER"));

  return (
    <Screen refreshing={members.refreshing} onRefresh={reload}>
      <Stack.Screen options={{ title: "Ομάδα" }} />
      {members.error && <ErrorBox message={members.error} onRetry={reload} />}
      <Card>
        <SectionTitle title={session.organization.name} count={members.data?.length} />
        {!members.data ? <Loading /> : members.data.map((m, i) => (
          <View key={m.userId} style={[styles.row, i === 0 && { borderTopWidth: 0 }, { flexWrap: "wrap" }]}>
            <View style={{ flex: 1, minWidth: 150 }}>
              <Text style={styles.rowTitle}>{m.name}{m.userId === me ? " (εσείς)" : ""}</Text>
              <Text style={styles.rowSub}>{m.email}</Text>
            </View>
            {myRole === "OWNER" && m.role !== "OWNER" ? (
              <View style={{ width: 150 }}>
                <SelectField label="" value={m.role} onChange={(v) => void action.run(() => api(`/api/members/${m.userId}`, { method: "PATCH", body: { role: v } }), { onSuccess: reload })}
                  options={[{ value: "ADMIN", label: "Διαχειριστής" }, { value: "MEMBER", label: "Μέλος" }]} />
              </View>
            ) : (
              <Badge label={humanize(m.role)} tone={m.role === "OWNER" ? "neutral" : m.role === "ADMIN" ? "accent" : "info"} />
            )}
            {canRemove(m) && (
              <Pressable hitSlop={10} accessibilityLabel={`Αφαίρεση ${m.name}`}
                onPress={() => confirm(`Αφαίρεση του/της ${m.name};`, "Οι ανοιχτές εργασίες του/της θα μείνουν χωρίς ανάθεση.", "Αφαίρεση",
                  () => void action.run(() => api(`/api/members/${m.userId}`, { method: "DELETE" }), { onSuccess: reload }))}>
                <Ionicons name="person-remove-outline" size={20} color={colors.danger} />
              </Pressable>
            )}
            {m.userId === me && m.role !== "OWNER" && (
              <Button small variant="danger" title="Αποχώρηση"
                onPress={() => confirm("Αποχώρηση από την ομάδα;", "Θα χάσετε την πρόσβαση στα δεδομένα της.", "Αποχώρηση",
                  () => void action.run(() => api(`/api/members/${me}`, { method: "DELETE" }), { onSuccess: () => void refresh() }))} />
            )}
          </View>
        ))}
      </Card>

      {canInvite && (
        <Card style={{ gap: 12 }}>
          <SectionTitle title="Πρόσκληση μέλους" />
          <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={err.email} placeholder="email@παράδειγμα.gr" />
          <SelectField label="Ρόλος" value={role} onChange={(v) => setRole(v as "MEMBER" | "ADMIN")}
            options={[{ value: "MEMBER", label: "Μέλος", detail: "π.χ. συνεργείο καθαρισμού — εργασίες και κρατήσεις" }, ...(myRole === "OWNER" ? [{ value: "ADMIN", label: "Διαχειριστής", detail: "Διαχειρίζεται τα πάντα και προσκαλεί μέλη" }] : [])]} />
          <Button title="Δημιουργία συνδέσμου" loading={pending} disabled={!email.trim()} onPress={() => void invite({ email: email.trim(), role })} />
          <Text style={styles.rowSub}>Ο σύνδεσμος ισχύει 7 ημέρες και μόνο για αυτό το email.</Text>
          {link && (
            <View style={{ backgroundColor: colors.accentSoft, borderRadius: 12, padding: 12, gap: 8 }}>
              <Text style={{ color: colors.text }}>Στείλτε τον σύνδεσμο στο <Text style={{ fontWeight: "700" }}>{link.email}</Text> (Viber, WhatsApp, email…). Εμφανίζεται μόνο τώρα.</Text>
              <Text selectable style={{ fontFamily: "monospace", fontSize: 12, color: colors.text }}>{link.url}</Text>
              <Button small title="Κοινοποίηση" onPress={() => void share(link)} style={{ alignSelf: "flex-start" }} />
            </View>
          )}
        </Card>
      )}

      {canInvite && (invitations.data?.length ?? 0) > 0 && (
        <Card>
          <SectionTitle title="Εκκρεμείς προσκλήσεις" count={invitations.data!.length} />
          {invitations.data!.map((i, idx) => (
            <View key={i.id} style={[styles.row, idx === 0 && { borderTopWidth: 0 }, { flexWrap: "wrap" }]}>
              <View style={{ flex: 1, minWidth: 150 }}>
                <Text style={styles.rowTitle}>{i.email}</Text>
                <Text style={styles.rowSub}>{humanize(i.role)} · λήγει {formatDay(i.expiresAt.slice(0, 10), false)}</Text>
              </View>
              <Button small variant="outline" title="Νέος σύνδεσμος" disabled={pending} onPress={() => void invite({ email: i.email, role: i.role as "MEMBER" | "ADMIN" })} />
              <Button small variant="ghost" title="Ακύρωση" onPress={() => void action.run(() => api(`/api/invitations/${i.id}`, { method: "DELETE" }), { onSuccess: reload })} />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
