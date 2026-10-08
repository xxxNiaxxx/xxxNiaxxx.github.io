import { useState } from "react";
import { ActionSheetIOS, Alert, Platform, Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Badge, Card, Empty, ErrorBox, Loading, Screen, statusTone, styles } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, humanize } from "@/lib/format";
import type { Task } from "@/lib/types";
import { useQuery } from "@/lib/use-query";
import { colors } from "@/theme";

const TABS = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "overdue", label: "Overdue" },
  { key: "completed", label: "Done" },
] as const;

export default function Tasks() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("today");
  const { data, error, loading, refreshing, reload, setData } = useQuery<Task[]>(`/api/tasks?tab=${tab}`);

  async function update(task: Task, body: Partial<Task>) {
    const previous = data;
    // Optimistic: reflect the change right away, roll back if the server refuses.
    setData((data ?? []).map((t) => (t.id === task.id ? { ...t, ...body } : t)));
    try {
      await api(`/api/tasks/${task.id}`, { method: "PATCH", body });
      void reload();
    } catch (e) {
      setData(previous);
      Alert.alert("Couldn't update task", e instanceof ApiError ? e.message : "Please try again.");
    }
  }

  function menu(task: Task) {
    const open = task.status === "TODO" || task.status === "IN_PROGRESS";
    const options: { label: string; body: Partial<Task> }[] = [
      ...(task.status === "TODO" ? [{ label: "Start", body: { status: "IN_PROGRESS" as const } }] : []),
      ...(open ? [{ label: "Complete", body: { status: "COMPLETED" as const } }, { label: "Cancel task", body: { status: "CANCELLED" as const } }] : [{ label: "Reopen", body: { status: "TODO" as const } }]),
    ];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ options: [...options.map((o) => o.label), "Close"], cancelButtonIndex: options.length, title: task.title }, (i) => {
        if (i < options.length) void update(task, options[i].body);
      });
    } else {
      Alert.alert(task.title, undefined, [...options.map((o) => ({ text: o.label, onPress: () => void update(task, o.body) })), { text: "Close", style: "cancel" }]);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <View style={{ flexDirection: "row", backgroundColor: colors.surface, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: colors.border }}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={{ flex: 1, paddingVertical: 8, borderRadius: 9, backgroundColor: tab === t.key ? colors.primary : "transparent" }}>
            <Text style={{ textAlign: "center", fontWeight: "600", fontSize: 13, color: tab === t.key ? colors.onPrimary : colors.mutedText }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data ? (
        <Loading />
      ) : data && data.length === 0 ? (
        <Card><Empty title={tab === "overdue" ? "Nothing overdue" : "No tasks here"} detail={tab === "overdue" ? "Every task is on schedule." : undefined} /></Card>
      ) : (
        (data ?? []).map((t) => <TaskRow key={t.id} task={t} onToggle={() => update(t, { status: t.status === "COMPLETED" ? "TODO" : "COMPLETED" })} onMenu={() => menu(t)} onChecklist={(checklist) => update(t, { checklist })} />)
      )}
    </Screen>
  );
}

function TaskRow({ task, onToggle, onMenu, onChecklist }: { task: Task; onToggle: () => void; onMenu: () => void; onChecklist: (c: Task["checklist"]) => void }) {
  const [expanded, setExpanded] = useState(false);
  const done = task.checklist.filter((c) => c.done).length;
  const completed = task.status === "COMPLETED";
  return (
    <Card style={{ padding: 14 }}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <Pressable onPress={onToggle} hitSlop={10} accessibilityLabel={completed ? "Reopen task" : "Complete task"}
          style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: completed ? colors.success : colors.subtleText, backgroundColor: completed ? colors.success : "transparent", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
          {completed && <Ionicons name="checkmark" size={15} color="#fff" />}
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => task.checklist.length && setExpanded((x) => !x)} onLongPress={onMenu}>
          <Text style={[styles.rowTitle, completed && { textDecorationLine: "line-through", color: colors.mutedText }]}>{task.title}</Text>
          <Text style={[styles.rowSub, task.overdue && { color: colors.danger }]}>
            {[humanize(task.type), task.propertyName, task.dueAt && `${task.overdue ? "overdue · " : ""}${formatDateTime(task.dueAt)}`].filter(Boolean).join(" · ")}
          </Text>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Badge label={humanize(task.priority)} tone={statusTone[task.priority]} />
            {task.status !== "TODO" && <Badge label={humanize(task.status)} tone={statusTone[task.status]} />}
            <Text style={styles.rowSub}>{task.assigneeName ?? "Unassigned"}</Text>
            {task.checklist.length > 0 && <Text style={[styles.rowSub, { color: colors.accent }]}>Checklist {done}/{task.checklist.length}</Text>}
          </View>
          {expanded && task.checklist.map((c, i) => (
            <Pressable key={i} onPress={() => onChecklist(task.checklist.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 }}>
              <Ionicons name={c.done ? "checkbox" : "square-outline"} size={20} color={c.done ? colors.accent : colors.subtleText} />
              <Text style={{ color: c.done ? colors.mutedText : colors.text, textDecorationLine: c.done ? "line-through" : "none" }}>{c.label}</Text>
            </Pressable>
          ))}
        </Pressable>
        <Pressable onPress={onMenu} hitSlop={10} accessibilityLabel="Task actions">
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.mutedText} />
        </Pressable>
      </View>
    </Card>
  );
}
