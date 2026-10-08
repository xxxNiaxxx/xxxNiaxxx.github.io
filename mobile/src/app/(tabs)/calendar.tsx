import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Badge, Card, Empty, ErrorBox, Loading, Screen, SectionTitle, statusTone, styles } from "@/components/ui";
import { addDays, formatDay, humanize, localToday } from "@/lib/format";
import type { Reservation } from "@/lib/types";
import { useQuery } from "@/lib/use-query";
import { colors } from "@/theme";

interface CalendarData {
  from: string;
  to: string;
  properties: { id: string; name: string; status: string }[];
  reservations: Reservation[];
  tasks: { id: string; propertyId: string; type: string; title: string; date: string | null }[];
}

const STRIP_DAYS = 14;

export default function Calendar() {
  const today = localToday();
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const { data, error, loading, refreshing, reload } = useQuery<CalendarData>(`/api/calendar?from=${today}&to=${addDays(today, 30)}`);

  const reservations = useMemo(() => (data?.reservations ?? []).filter((r) => !propertyId || r.propertyId === propertyId), [data, propertyId]);
  const days = useMemo(() => {
    const out: { day: string; arrivals: Reservation[]; departures: Reservation[] }[] = [];
    for (let i = 0; i < 30; i++) {
      const day = addDays(today, i);
      const arrivals = reservations.filter((r) => r.checkIn === day);
      const departures = reservations.filter((r) => r.checkOut === day);
      if (arrivals.length || departures.length) out.push({ day, arrivals, departures });
    }
    return out;
  }, [reservations, today]);

  if (loading && !data) return <Loading />;
  const properties = data?.properties ?? [];
  const stripDays = Array.from({ length: STRIP_DAYS }, (_, i) => addDays(today, i));

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      {error && <ErrorBox message={error} onRetry={reload} />}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {[{ id: null, name: "All properties" }, ...properties].map((p) => {
          const active = propertyId === p.id;
          return (
            <Pressable key={p.id ?? "all"} onPress={() => setPropertyId(p.id)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: active ? colors.primary : colors.surface, borderWidth: 1, borderColor: active ? colors.primary : colors.border }}>
              <Text style={{ color: active ? colors.onPrimary : colors.text, fontWeight: "600", fontSize: 13 }}>{p.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Card>
        <SectionTitle title="Next 14 days" />
        <View style={{ flexDirection: "row", marginLeft: 96, marginBottom: 4 }}>
          {stripDays.map((d) => (
            <Text key={d} style={{ flex: 1, textAlign: "center", fontSize: 10, color: d === today ? colors.accent : colors.mutedText, fontWeight: d === today ? "700" : "400" }}>{Number(d.slice(8))}</Text>
          ))}
        </View>
        {properties.filter((p) => !propertyId || p.id === propertyId).map((p) => (
          <View key={p.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 5 }}>
            <Text numberOfLines={1} style={{ width: 96, fontSize: 12, fontWeight: "600", color: colors.text }}>{p.name}</Text>
            {stripDays.map((d) => {
              const stay = (data?.reservations ?? []).find((r) => r.propertyId === p.id && r.checkIn <= d && r.checkOut > d);
              return (
                <Pressable
                  key={d}
                  onPress={() => stay && router.push(`/reservation/${stay.id}`)}
                  style={{ flex: 1, height: 18, marginHorizontal: 1, borderRadius: 3, backgroundColor: stay ? (stay.status === "PENDING" ? "#FDE68A" : colors.accent) : colors.muted }}
                />
              );
            })}
          </View>
        ))}
        <Text style={[styles.rowSub, { marginTop: 8 }]}>Green = booked night · yellow = pending. Tap a block to open the stay.</Text>
      </Card>

      <Card>
        <SectionTitle title="Arrivals & departures" />
        {days.length === 0 && <Empty title="Nothing in the next 30 days" />}
        {days.map(({ day, arrivals, departures }) => (
          <View key={day} style={{ marginTop: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: day === today ? colors.accent : colors.mutedText, textTransform: "uppercase" }}>
              {day === today ? "Today · " : day === addDays(today, 1) ? "Tomorrow · " : ""}{formatDay(day)}
            </Text>
            {[...arrivals.map((r) => ({ r, kind: "Check-in" })), ...departures.map((r) => ({ r, kind: "Check-out" }))].map(({ r, kind }) => (
              <Pressable key={`${kind}-${r.id}`} onPress={() => router.push(`/reservation/${r.id}`)} style={styles.row}>
                <View style={{ width: 4, alignSelf: "stretch", borderRadius: 2, backgroundColor: kind === "Check-in" ? colors.success : colors.subtleText }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{r.guestName}</Text>
                  <Text style={styles.rowSub}>{kind} · {r.propertyName}{kind === "Check-in" ? ` · ${r.nights} nights` : ""}</Text>
                </View>
                <Badge label={humanize(r.status)} tone={statusTone[r.status]} />
              </Pressable>
            ))}
          </View>
        ))}
      </Card>
    </Screen>
  );
}
