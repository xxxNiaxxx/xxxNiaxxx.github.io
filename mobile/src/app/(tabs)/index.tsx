import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { Badge, Card, Empty, ErrorBox, Loading, Screen, SectionTitle, Stat, statusTone, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDay, formatMoney, formatPercent, formatTime, humanize } from "@/lib/format";
import type { Dashboard, Reservation, Task } from "@/lib/types";
import { useQuery } from "@/lib/use-query";
import { colors } from "@/theme";

const severityColor = { high: colors.danger, medium: colors.warning, low: colors.subtleText };
const SUGGESTIONS = ["Τι χρειάζεται την προσοχή μου σήμερα;", "Ποιος έρχεται αύριο;", "Πόσα έβγαλα αυτόν τον μήνα;"];

function hrefToRoute(href: string) {
  if (href.startsWith("/reservations/import")) return "/reservations" as const;
  const m = href.match(/^\/reservations\/([^/?]+)/);
  if (m) return `/reservation/${m[1]}` as const;
  const p = href.match(/^\/properties\/([^/?]+)/);
  if (p) return `/property/${p[1]}` as const;
  if (href.startsWith("/tax")) return "/tax" as const;
  if (href.startsWith("/tasks")) return "/tasks" as const;
  if (href.startsWith("/ai")) return "/ai" as const;
  return null;
}

export default function Today() {
  const { data, error, loading, refreshing, reload } = useQuery<Dashboard>("/api/dashboard");
  // Read the Airbnb/Booking calendars (the server skips ones read in the last 30 minutes).
  useEffect(() => {
    api<{ created: number; updated: number; cancelled: number }>("/api/calendars/sync", { body: {} })
      .then((r) => r.created + r.updated + r.cancelled > 0 && void reload())
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (loading && !data) return <Loading />;

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <View>
        <Text style={{ fontSize: 26, fontWeight: "700", color: colors.text, letterSpacing: -0.5 }}>Γεια σας!</Text>
        {data && (
          <Text style={{ color: colors.mutedText, marginTop: 2 }}>
            {formatDay(data.today)} · {data.attention.length ? `${data.attention.length} θέματα χρειάζονται προσοχή` : "όλα είναι εντάξει"}
          </Text>
        )}
      </View>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <Stat label="Αφίξεις" value={data.summary.checkInsToday} hint="σήμερα" />
            <Stat label="Αναχωρήσεις" value={data.summary.checkOutsToday} hint="σήμερα" />
            <Stat label="Φιλοξενούνται" value={data.summary.activeReservations} hint="απόψε" />
            <Stat label="Πληρότητα" value={formatPercent(data.summary.occupancy)} hint="αυτόν τον μήνα" />
            <Stat label="Έσοδα" value={formatMoney(data.summary.monthlyRevenue, data.summary.currency)} hint="αυτόν τον μήνα" />
            <Stat label="Ακίνητα" value={data.summary.activeProperties} hint={`${data.summary.properties} συνολικά`} />
          </View>

          <Card>
            <SectionTitle title="Χρειάζονται προσοχή" count={data.attention.length} />
            {data.attention.length === 0 ? (
              <Empty title="Όλα εντάξει" detail="Τίποτα δεν χρειάζεται την προσοχή σας αυτή τη στιγμή." />
            ) : (
              data.attention.map((a, i) => {
                const route = hrefToRoute(a.href);
                return (
                  <Pressable key={i} onPress={() => route && router.push(route)} style={({ pressed }) => [styles.row, i === 0 && { borderTopWidth: 0 }, pressed && { opacity: 0.6 }]}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: severityColor[a.severity] }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { fontSize: 14 }]}>{a.title}</Text>
                      <Text style={styles.rowSub} numberOfLines={1}>{a.detail}</Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </Card>

          <Card>
            <SectionTitle title="Ρωτήστε τον βοηθό AI" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} onPress={() => router.push({ pathname: "/ai", params: { q: s } })} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
                  <Text style={{ fontSize: 13, color: colors.mutedText }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <Card>
            <SectionTitle title="Σήμερα" />
            <Agenda title="Αφίξεις" items={data.todayAgenda.checkIns} />
            <Agenda title="Αναχωρήσεις" items={data.todayAgenda.checkOuts} />
            <TaskGroup title="Καθαρισμοί" tasks={data.todayAgenda.cleaning} />
            <TaskGroup title="Συντήρηση" tasks={data.todayAgenda.maintenance} />
            <TaskGroup title="Άλλες εργασίες" tasks={data.todayAgenda.other} />
          </Card>
        </>
      )}
    </Screen>
  );
}

function GroupLabel({ title, count }: { title: string; count: number }) {
  return <Text style={{ fontSize: 12, fontWeight: "700", color: colors.mutedText, textTransform: "uppercase", marginTop: 12, marginBottom: 2 }}>{title} · {count}</Text>;
}

function Agenda({ title, items }: { title: string; items: Reservation[] }) {
  return (
    <View>
      <GroupLabel title={title} count={items.length} />
      {items.length === 0 && <Text style={styles.rowSub}>Καμία σήμερα</Text>}
      {items.map((r) => (
        <Pressable key={r.id} onPress={() => router.push(`/reservation/${r.id}`)} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{r.guestName}</Text>
            <Text style={styles.rowSub}>{r.propertyName} · {r.guestsCount} άτομα · {r.nights} νύχτες</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function TaskGroup({ title, tasks }: { title: string; tasks: Task[] }) {
  return (
    <View>
      <GroupLabel title={title} count={tasks.length} />
      {tasks.length === 0 && <Text style={styles.rowSub}>Καμία σήμερα</Text>}
      {tasks.map((t) => (
        <Pressable key={t.id} onPress={() => router.push("/tasks")} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{t.title}</Text>
            <Text style={styles.rowSub}>{[t.propertyName, t.dueAt && formatTime(t.dueAt), t.assigneeName].filter(Boolean).join(" · ")}</Text>
          </View>
          <Badge label={humanize(t.status)} tone={statusTone[t.status]} />
        </Pressable>
      ))}
    </View>
  );
}
