import { router, Stack, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { CalendarSyncCard } from "@/components/calendar-sync";
import { CheckRow, DateField, LinkRow } from "@/components/form";
import { GuestPagesCard, PriceIdeasCard } from "@/components/guest-pages";
import { Badge, Button, Card, ErrorBox, Loading, Screen, SectionTitle, Stat, statusTone, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { COMPLIANCE_ITEMS } from "@/lib/constants";
import { formatDateTime, formatDay, formatMoney, formatPercent, humanize } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { PropertyDetails } from "@/lib/types";
import { confirm, useMutation } from "@/lib/use-mutation";
import { useQuery } from "@/lib/use-query";
import { colors } from "@/theme";

export default function PropertyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const { data, error, loading, refreshing, reload } = useQuery<PropertyDetails>(`/api/properties/${id}`);
  const { run, pending } = useMutation();

  if (loading && !data) return <Loading />;
  if (!data) return <Screen>{error && <ErrorBox message={error} onRetry={reload} />}</Screen>;
  const p = data.property;
  const admin = session?.role === "OWNER" || session?.role === "ADMIN";
  const patch = (body: object) => run(() => api(`/api/properties/${p.id}`, { method: "PATCH", body }), { onSuccess: () => void reload() });
  const insurance = typeof p.compliance.insuranceExpiresOn === "string" ? p.compliance.insuranceExpiresOn : "";

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Stack.Screen options={{ title: p.name }} />
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={[styles.sectionTitle, { flex: 1 }]}>{p.name}</Text>
          <Badge label={humanize(p.status)} tone={p.status === "ACTIVE" ? "success" : "neutral"} />
        </View>
        <Text style={[styles.rowSub, { marginTop: 4 }]}>{[p.address, p.city, p.country].filter(Boolean).join(", ")}</Text>
        <Text style={[styles.rowSub, { marginTop: 4 }]}>
          {humanize(p.kind)}{p.areaSqm ? ` · ${p.areaSqm} m²` : ""} · {p.bedrooms} υπνοδωμάτια · {p.bathrooms} μπάνια · έως {p.maxGuests} άτομα
        </Text>
        <Text style={[styles.rowSub, { marginTop: 4 }]}>Βασική τιμή {formatMoney(p.basePrice, p.currency)}/νύχτα · {p.ama ? `ΑΜΑ ${p.ama}` : "Χωρίς ΑΜΑ"}</Text>
        {p.description ? <Text style={{ marginTop: 10, color: colors.text }}>{p.description}</Text> : null}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          {p.status === "ACTIVE" && <Button small title="Νέα κράτηση" onPress={() => router.push({ pathname: "/reservation/new", params: { propertyId: p.id } })} />}
          <Button small variant="outline" title="Νέα εργασία" onPress={() => router.push({ pathname: "/task/new", params: { propertyId: p.id } })} />
          {admin && <Button small variant="outline" title="Επεξεργασία" onPress={() => router.push(`/property/edit/${p.id}`)} />}
          {admin && (
            <Button small variant={p.status === "ACTIVE" ? "danger" : "outline"} loading={pending} title={p.status === "ACTIVE" ? "Απενεργοποίηση" : "Ενεργοποίηση"}
              onPress={() => p.status === "ACTIVE"
                ? confirm("Απενεργοποίηση ακινήτου;", "Δεν θα δέχεται νέες κρατήσεις.", "Απενεργοποίηση", () => void patch({ status: "INACTIVE" }))
                : void patch({ status: "ACTIVE" })} />
          )}
        </View>
      </Card>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <Stat label="Έσοδα μήνα" value={formatMoney(data.month.income, p.currency)} />
        <Stat label="Καθαρά" value={formatMoney(data.month.net, p.currency)} hint={`έξοδα ${formatMoney(data.month.expenses, p.currency)}`} />
        <Stat label="Πληρότητα" value={formatPercent(data.month.occupancy)} hint={`${data.month.bookedNights} νύχτες`} />
      </View>

      <Card style={{ paddingBottom: 6 }}>
        <SectionTitle title="Διαμονές" />
        {data.currentReservation && (
          <LinkRow first title={`Τώρα: ${data.currentReservation.guestName}`} subtitle={`έως ${formatDay(data.currentReservation.checkOut)}`} onPress={() => router.push(`/reservation/${data.currentReservation!.id}`)} />
        )}
        {data.upcomingReservations.map((r, i) => (
          <LinkRow key={r.id} first={!data.currentReservation && i === 0} title={r.guestName ?? "—"} subtitle={`${formatDay(r.checkIn)} → ${formatDay(r.checkOut)} · ${r.nights} νύχτες`}
            right={<Badge label={humanize(r.status)} tone={statusTone[r.status]} />} onPress={() => router.push(`/reservation/${r.id}`)} />
        ))}
        {!data.currentReservation && data.upcomingReservations.length === 0 && <Text style={[styles.rowSub, { paddingBottom: 10 }]}>Καμία επερχόμενη διαμονή.</Text>}
      </Card>

      <Card>
        <SectionTitle title="Ανοιχτές εργασίες" count={data.openTasks.length} />
        {data.openTasks.length === 0 && <Text style={styles.rowSub}>Καμία ανοιχτή εργασία.</Text>}
        {data.openTasks.map((t) => (
          <View key={t.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{t.title}</Text>
              <Text style={[styles.rowSub, t.overdue && { color: colors.danger }]}>{humanize(t.type)}{t.dueAt ? ` · ${formatDateTime(t.dueAt)}` : ""}</Text>
            </View>
            <Badge label={humanize(t.priority)} tone={statusTone[t.priority]} />
          </View>
        ))}
      </Card>

      <PriceIdeasCard propertyId={p.id} />
      <GuestPagesCard property={p} admin={admin} onChanged={() => void reload()} />
      <CalendarSyncCard propertyId={p.id} onSynced={reload} />

      <Card style={{ gap: 4 }}>
        <SectionTitle title="Προδιαγραφές (από 1/10/2025)" />
        {COMPLIANCE_ITEMS.map((item) => (
          <CheckRow key={item.key} label={item.label} value={p.compliance[item.key] === true} onChange={(v) => void patch({ compliance: { [item.key]: v } })} />
        ))}
        <View style={{ marginTop: 8 }}>
          <DateField label="Λήξη ασφάλισης αστικής ευθύνης" value={insurance} clearable onChange={(v) => void patch({ compliance: { insuranceExpiresOn: v || null } })}
            hint={!insurance ? "Δεν έχει καταχωριστεί" : undefined} />
        </View>
      </Card>
    </Screen>
  );
}
