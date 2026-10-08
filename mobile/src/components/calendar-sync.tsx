import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { SelectField, TextField } from "@/components/form";
import { Button, Card, SectionTitle, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { CALENDAR_SOURCES } from "@/lib/constants";
import { formatDateTime, humanize } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { CalendarFeed, SyncResult } from "@/lib/types";
import { confirm, notify, useMutation } from "@/lib/use-mutation";
import { useQuery } from "@/lib/use-query";
import { colors } from "@/theme";

const SOURCES = CALENDAR_SOURCES.map((value) => ({ value, label: value === "OTHER" ? "Άλλη πλατφόρμα" : humanize(value) }));
const sourceLabel = (s: string) => SOURCES.find((x) => x.value === s)?.label ?? s;
const summary = (r: SyncResult) => `${r.created} νέες, ${r.updated} αλλαγές, ${r.cancelled} ακυρώσεις`;

/** iCal: import Airbnb/Booking calendars and share the property's own calendar link. */
export function CalendarSyncCard({ propertyId, onSynced }: { propertyId: string; onSynced: () => void }) {
  const { session, serverUrl } = useSession();
  const admin = session?.role === "OWNER" || session?.role === "ADMIN";
  const { data, reload } = useQuery<{ feeds: CalendarFeed[]; exportPath: string | null }>(`/api/properties/${propertyId}/calendars`);
  const { run, pending, fieldErrors: err } = useMutation();
  const [source, setSource] = useState("AIRBNB");
  const [url, setUrl] = useState("");
  if (!data) return null;
  const exportUrl = data.exportPath ? `${serverUrl}${data.exportPath}` : null;

  return (
    <Card style={{ gap: 10 }}>
      <SectionTitle title="Ημερολόγια Airbnb / Booking (iCal)" />
      <Text style={styles.rowSub}>
        Οι νέες κρατήσεις έρχονται μόνες τους. Το iCal δεν έχει ποσά ούτε ονόματα — συμπληρώστε τα ή κάντε εισαγωγή του αρχείου κρατήσεων από το web.
      </Text>
      {data.feeds.map((f) => (
        <View key={f.id} style={[styles.row, { alignItems: "flex-start" }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{sourceLabel(f.source)}</Text>
            <Text style={styles.rowSub} numberOfLines={1}>{f.url.replace(/^https:\/\//, "")}</Text>
            <Text style={[styles.rowSub, f.lastError ? { color: colors.danger } : null]}>
              {f.lastError ?? (f.lastSyncedAt ? `Συγχρονισμός ${formatDateTime(f.lastSyncedAt)}` : "Δεν έχει συγχρονιστεί")}
            </Text>
          </View>
          {admin && (
            <Pressable hitSlop={10} accessibilityLabel="Αφαίρεση ημερολογίου"
              onPress={() => confirm("Αφαίρεση ημερολογίου;", "Οι κρατήσεις που έφερε μένουν.", "Αφαίρεση", () => void run(() => api(`/api/calendars/${f.id}`, { method: "DELETE" }), { onSuccess: () => void reload() }))}>
              <Ionicons name="trash-outline" size={18} color={colors.mutedText} />
            </Pressable>
          )}
        </View>
      ))}
      {admin && (
        <View style={{ gap: 10, marginTop: 4 }}>
          <SelectField label="Πλατφόρμα" value={source} onChange={setSource} options={SOURCES} />
          <TextField label="Σύνδεσμος iCal της πλατφόρμας" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" error={err.url}
            placeholder="https://www.airbnb.com/calendar/ical/….ics" hint="Airbnb: Ημερολόγιο → Διαθεσιμότητα → Σύνδεση ημερολογίων. Booking: Extranet → Τιμές & Διαθεσιμότητα → Συγχρονισμός ημερολογίων." />
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Button small title="Προσθήκη" loading={pending} disabled={!url.trim()}
              onPress={() => void run(() => api<{ result: SyncResult }>(`/api/properties/${propertyId}/calendars`, { body: { source, url: url.trim() } }), {
                onSuccess: (r) => {
                  setUrl("");
                  void reload();
                  onSynced();
                  notify(r.result.error ? "Το ημερολόγιο προστέθηκε με σφάλμα" : "Το ημερολόγιο προστέθηκε", r.result.error ?? summary(r.result));
                },
              })} />
            {data.feeds.length > 0 && (
              <Button small variant="outline" title="Συγχρονισμός τώρα" loading={pending}
                onPress={() => void run(() => api<SyncResult & { errors: string[] }>("/api/calendars/sync", { body: { propertyId, force: true } }), {
                  onSuccess: (r) => {
                    void reload();
                    onSynced();
                    notify("Συγχρονισμός", r.errors.length ? r.errors[0] : summary(r));
                  },
                })} />
            )}
          </View>
        </View>
      )}

      <View style={[styles.row, { flexDirection: "column", alignItems: "stretch", gap: 8 }]}>
        <Text style={styles.rowTitle}>Αποστολή διαθεσιμότητας στις πλατφόρμες</Text>
        <Text style={styles.rowSub}>Βάλτε αυτόν τον σύνδεσμο στο Airbnb και στο Booking («Εισαγωγή ημερολογίου») για να κλείνουν οι ημερομηνίες των κρατήσεων που περνάτε εδώ.</Text>
        {exportUrl ? (
          <>
            <Text selectable style={{ fontFamily: "monospace", fontSize: 12, color: colors.text }}>{exportUrl}</Text>
            <Button small title="Κοινοποίηση συνδέσμου" style={{ alignSelf: "flex-start" }} onPress={() => void Share.share({ message: exportUrl }).catch(() => {})} />
          </>
        ) : admin ? (
          <Button small variant="outline" title="Δημιουργία συνδέσμου iCal" loading={pending} style={{ alignSelf: "flex-start" }}
            onPress={() => void run(() => api(`/api/properties/${propertyId}/calendars/export`, { method: "POST" }), { onSuccess: () => void reload() })} />
        ) : (
          <Text style={styles.rowSub}>Δεν έχει δημιουργηθεί σύνδεσμος.</Text>
        )}
      </View>
    </Card>
  );
}
