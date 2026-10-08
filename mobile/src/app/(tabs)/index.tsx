import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Badge, Card, Empty, ErrorBox, Loading, Screen, SectionTitle, Stat, statusTone, styles } from "@/components/ui";
import { formatDay, formatMoney, formatPercent, formatTime, humanize } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { Dashboard, Reservation, Task } from "@/lib/types";
import { useQuery } from "@/lib/use-query";
import { colors } from "@/theme";

const severityColor = { high: colors.danger, medium: colors.warning, low: colors.subtleText };
const SUGGESTIONS = ["What needs my attention today?", "Who checks in tomorrow?", "How much did I make this month?"];

function hrefToRoute(href: string) {
  const m = href.match(/^\/reservations\/([^/?]+)/);
  if (m) return `/reservation/${m[1]}` as const;
  if (href.startsWith("/tasks")) return "/tasks" as const;
  if (href.startsWith("/ai")) return "/ai" as const;
  return null;
}

export default function Today() {
  const { session } = useSession();
  const { data, error, loading, refreshing, reload } = useQuery<Dashboard>("/api/dashboard");
  if (loading && !data) return <Loading />;
  const first = session?.user.name?.split(" ")[0];

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <View>
        <Text style={{ fontSize: 26, fontWeight: "700", color: colors.text, letterSpacing: -0.5 }}>Hello{first ? `, ${first}` : ""}</Text>
        {data && (
          <Text style={{ color: colors.mutedText, marginTop: 2 }}>
            {formatDay(data.today)} · {data.attention.length ? `${data.attention.length} things need your attention` : "you're all caught up"}
          </Text>
        )}
      </View>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            <Stat label="Check-ins" value={data.summary.checkInsToday} hint="today" />
            <Stat label="Check-outs" value={data.summary.checkOutsToday} hint="today" />
            <Stat label="In-house" value={data.summary.activeReservations} hint="stays tonight" />
            <Stat label="Occupancy" value={formatPercent(data.summary.occupancy)} hint="this month" />
            <Stat label="Revenue" value={formatMoney(data.summary.monthlyRevenue, data.summary.currency)} hint="this month" />
            <Stat label="Properties" value={data.summary.activeProperties} hint={`${data.summary.properties} total`} />
          </View>

          <Card>
            <SectionTitle title="Needs attention" count={data.attention.length} />
            {data.attention.length === 0 ? (
              <Empty title="All clear" detail="Nothing needs your attention right now." />
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
            <SectionTitle title="Ask your AI manager" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} onPress={() => router.push({ pathname: "/ai", params: { q: s } })} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
                  <Text style={{ fontSize: 13, color: colors.mutedText }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <Card>
            <SectionTitle title="Today" />
            <Agenda title="Check-ins" items={data.todayAgenda.checkIns} />
            <Agenda title="Check-outs" items={data.todayAgenda.checkOuts} />
            <TaskGroup title="Cleaning" tasks={data.todayAgenda.cleaning} />
            <TaskGroup title="Maintenance" tasks={data.todayAgenda.maintenance} />
            <TaskGroup title="Other tasks" tasks={data.todayAgenda.other} />
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
      {items.length === 0 && <Text style={styles.rowSub}>None today</Text>}
      {items.map((r) => (
        <Pressable key={r.id} onPress={() => router.push(`/reservation/${r.id}`)} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{r.guestName}</Text>
            <Text style={styles.rowSub}>{r.propertyName} · {r.guestsCount} guests · {r.nights} nights</Text>
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
      {tasks.length === 0 && <Text style={styles.rowSub}>None today</Text>}
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
