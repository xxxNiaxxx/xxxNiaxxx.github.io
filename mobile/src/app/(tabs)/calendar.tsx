import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Badge, Card, Empty, ErrorBox, Loading, Screen, SectionTitle, statusTone, styles } from "@/components/ui";
import { addMonths, monthGrid, monthStart, weekSegments } from "@/lib/calendar-grid";
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

const MONTH_NAMES = ["Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος", "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"];
const WEEKDAYS = ["Δ", "Τ", "Τ", "Π", "Π", "Σ", "Κ"];
const BAR_COLOR: Record<string, string> = { CONFIRMED: colors.accent, PENDING: "#F59E0B", COMPLETED: colors.subtleText };

export default function Calendar() {
  const today = localToday();
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [month, setMonth] = useState(() => monthStart(today));
  const [selected, setSelected] = useState(today);
  const grid = useMemo(() => monthGrid(month), [month]);
  // The month on screen (with the days that complete its weeks), and the next 30 days for arrivals and departures.
  const monthQuery = useQuery<CalendarData>(`/api/calendar?from=${grid.from}&to=${grid.to}`);
  const { data, error, loading, refreshing, reload } = useQuery<CalendarData>(`/api/calendar?from=${today}&to=${addDays(today, 30)}`);

  const reservations = useMemo(() => (data?.reservations ?? []).filter((r) => !propertyId || r.propertyId === propertyId), [data, propertyId]);
  const monthStays = useMemo(() => (monthQuery.data?.reservations ?? []).filter((r) => !propertyId || r.propertyId === propertyId), [monthQuery.data, propertyId]);
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
  const properties = data?.properties ?? monthQuery.data?.properties ?? [];
  const onSelected = monthStays.filter((r) => (r.checkIn <= selected && r.checkOut > selected) || r.checkOut === selected);
  const [y, m] = month.split("-").map(Number);
  const refresh = () => {
    reload();
    monthQuery.reload();
  };

  return (
    <Screen refreshing={refreshing || monthQuery.refreshing} onRefresh={refresh}>
      {(error || monthQuery.error) && <ErrorBox message={(error || monthQuery.error)!} onRetry={refresh} />}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {[{ id: null, name: "Όλα τα ακίνητα" }, ...properties].map((p) => {
          const active = propertyId === p.id;
          return (
            <Pressable key={p.id ?? "all"} onPress={() => setPropertyId(p.id)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: active ? colors.primary : colors.surface, borderWidth: 1, borderColor: active ? colors.primary : colors.border }}>
              <Text style={{ color: active ? colors.onPrimary : colors.text, fontWeight: "600", fontSize: 13 }}>{p.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Card>
        <SectionTitle
          title={`${MONTH_NAMES[m - 1]} ${y}`}
          right={
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[
                { label: "‹", onPress: () => setMonth(addMonths(month, -1)), a11y: "Προηγούμενος μήνας" },
                { label: "Σήμερα", onPress: () => { setMonth(monthStart(today)); setSelected(today); }, a11y: "Σήμερα" },
                { label: "›", onPress: () => setMonth(addMonths(month, 1)), a11y: "Επόμενος μήνας" },
              ].map((b) => (
                <Pressable key={b.a11y} onPress={b.onPress} accessibilityLabel={b.a11y} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>{b.label}</Text>
                </Pressable>
              ))}
            </View>
          }
        />
        <View style={{ flexDirection: "row", marginTop: 4 }}>
          {WEEKDAYS.map((w, i) => (
            <Text key={i} style={{ flex: 1, textAlign: "center", fontSize: 11, fontWeight: "600", color: colors.mutedText }}>{w}</Text>
          ))}
        </View>
        {grid.weeks.map((week) => {
          const segments = weekSegments(week[0], monthStays);
          const lanes = Math.max(...segments.map((s) => s.lane + 1), 0);
          const shownLanes = Math.min(lanes, 4);
          return (
            <View key={week[0]} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 4 }}>
              <View style={{ flexDirection: "row" }}>
                {week.map((d) => {
                  const inMonth = d >= grid.monthFrom && d < grid.monthTo;
                  const isSel = d === selected;
                  const isToday = d === today;
                  return (
                    <Pressable key={d} onPress={() => setSelected(d)} accessibilityLabel={formatDay(d)} style={{ flex: 1, alignItems: "center", paddingTop: 4 }}>
                      <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: isToday ? colors.accent : isSel ? colors.accentSoft : "transparent", borderWidth: isSel && !isToday ? 1 : 0, borderColor: colors.accent }}>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: isToday ? "#fff" : inMonth ? colors.text : colors.subtleText }}>{Number(d.slice(8))}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              <View pointerEvents="none" style={{ height: shownLanes * 8 + 2, marginTop: 2 }}>
                {segments.filter((s) => s.lane < 4).map((s) => (
                  <View
                    key={s.stay.id}
                    style={{
                      position: "absolute",
                      top: s.lane * 8,
                      left: `${(s.start / 7) * 100}%`,
                      width: `${((s.end - s.start) / 7) * 100}%`,
                      height: 6,
                      paddingHorizontal: 2,
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: BAR_COLOR[s.stay.status] ?? colors.accent,
                        borderTopLeftRadius: s.continuesLeft ? 0 : 3,
                        borderBottomLeftRadius: s.continuesLeft ? 0 : 3,
                        borderTopRightRadius: s.continuesRight ? 0 : 3,
                        borderBottomRightRadius: s.continuesRight ? 0 : 3,
                      }}
                    />
                  </View>
                ))}
              </View>
            </View>
          );
        })}
        <Text style={[styles.rowSub, { marginTop: 6 }]}>Πράσινο = κλεισμένη νύχτα · γκρι = ολοκληρώθηκε · πορτοκαλί = εκκρεμεί. Πατήστε μια ημέρα για λεπτομέρειες.</Text>
      </Card>

      <Card>
        <SectionTitle title={selected === today ? `Σήμερα · ${formatDay(selected)}` : formatDay(selected)} />
        {onSelected.length === 0 ? (
          <Empty title="Ελεύθερο" />
        ) : (
          onSelected.map((r) => {
            const kind = r.checkIn === selected ? "Άφιξη" : r.checkOut === selected ? "Αναχώρηση" : "Διαμονή";
            return (
              <Pressable key={r.id} onPress={() => router.push(`/reservation/${r.id}`)} style={styles.row}>
                <View style={{ width: 4, alignSelf: "stretch", borderRadius: 2, backgroundColor: kind === "Αναχώρηση" ? colors.subtleText : BAR_COLOR[r.status] ?? colors.accent }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{r.guestName}</Text>
                  <Text style={styles.rowSub}>{kind} · {r.propertyName} · {formatDay(r.checkIn, false)} → {formatDay(r.checkOut, false)}</Text>
                </View>
                <Badge label={humanize(r.status)} tone={statusTone[r.status]} />
              </Pressable>
            );
          })
        )}
      </Card>

      <Card>
        <SectionTitle title="Αφίξεις & αναχωρήσεις" />
        {days.length === 0 && <Empty title="Τίποτα τις επόμενες 30 ημέρες" />}
        {days.map(({ day, arrivals, departures }) => (
          <View key={day} style={{ marginTop: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: day === today ? colors.accent : colors.mutedText, textTransform: "uppercase" }}>
              {day === today ? "Σήμερα · " : day === addDays(today, 1) ? "Αύριο · " : ""}{formatDay(day)}
            </Text>
            {[...arrivals.map((r) => ({ r, kind: "Άφιξη" })), ...departures.map((r) => ({ r, kind: "Αναχώρηση" }))].map(({ r, kind }) => (
              <Pressable key={`${kind}-${r.id}`} onPress={() => router.push(`/reservation/${r.id}`)} style={styles.row}>
                <View style={{ width: 4, alignSelf: "stretch", borderRadius: 2, backgroundColor: kind === "Άφιξη" ? colors.success : colors.subtleText }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{r.guestName}</Text>
                  <Text style={styles.rowSub}>{kind} · {r.propertyName}{kind === "Άφιξη" ? ` · ${r.nights} νύχτες` : ""}</Text>
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
