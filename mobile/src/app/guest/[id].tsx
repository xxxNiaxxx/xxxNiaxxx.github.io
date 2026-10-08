import { router, Stack, useLocalSearchParams } from "expo-router";
import { Linking, Text, View } from "react-native";
import { LinkRow } from "@/components/form";
import { Badge, Button, Card, ErrorBox, Loading, Screen, SectionTitle, Stat, statusTone, styles } from "@/components/ui";
import { languageName } from "@/lib/constants";
import { formatDateTime, formatDay, formatMoney, humanize } from "@/lib/format";
import type { GuestDetails } from "@/lib/types";
import { useQuery } from "@/lib/use-query";
import { colors } from "@/theme";

export default function GuestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading, refreshing, reload } = useQuery<GuestDetails>(`/api/guests/${id}`);
  if (loading && !data) return <Loading />;
  if (!data) return <Screen>{error && <ErrorBox message={error} onRetry={reload} />}</Screen>;
  const g = data.guest;

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Stack.Screen options={{ title: g.fullName }} />
      <Card>
        <Text style={styles.sectionTitle}>{g.fullName}</Text>
        <Text style={[styles.rowSub, { marginTop: 4 }]}>{[g.email, g.phone, g.country].filter(Boolean).join(" · ") || "Χωρίς στοιχεία επικοινωνίας"}</Text>
        <Text style={[styles.rowSub, { marginTop: 4 }]}>Γλώσσα μηνυμάτων: {languageName(g.language)}{g.languagePreference ? "" : " (από τη χώρα)"}</Text>
        {g.notes ? <Text style={{ marginTop: 10, backgroundColor: colors.muted, padding: 10, borderRadius: 10, color: colors.text }}>{g.notes}</Text> : null}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          {g.phone && <Button small variant="outline" title="Κλήση" onPress={() => Linking.openURL(`tel:${g.phone}`)} />}
          {g.email && <Button small variant="outline" title="Email" onPress={() => Linking.openURL(`mailto:${g.email}`)} />}
          <Button small variant="outline" title="Επεξεργασία" onPress={() => router.push(`/guest/edit/${g.id}`)} />
          <Button small title="Νέα κράτηση" onPress={() => router.push({ pathname: "/reservation/new", params: { guestId: g.id } })} />
        </View>
      </Card>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <Stat label="Διαμονές" value={data.stats.stays} hint={`μέσος όρος ${data.stats.averageStay} νύχτες`} />
        <Stat label="Συνολικά έσοδα" value={formatMoney(data.stats.totalRevenue, data.stats.currency)} />
      </View>

      <Card style={{ paddingBottom: 6 }}>
        <SectionTitle title="Κρατήσεις" count={data.reservations.length} />
        {data.reservations.map((r, i) => (
          <LinkRow key={r.id} first={i === 0} title={r.propertyName ?? "—"} subtitle={`${formatDay(r.checkIn)} → ${formatDay(r.checkOut)} ${r.checkIn.slice(0, 4)} · ${r.complimentary ? "Δωρεάν" : formatMoney(r.totalAmount, r.currency)}`}
            right={<Badge label={humanize(r.status)} tone={statusTone[r.status]} />} onPress={() => router.push(`/reservation/${r.id}`)} />
        ))}
      </Card>

      <Card>
        <SectionTitle title="Μηνύματα" count={data.messages.length} />
        {data.messages.length === 0 && <Text style={styles.rowSub}>Δεν υπάρχουν μηνύματα.</Text>}
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
