import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { TaskCard } from '@/components/TaskCard';
import { AppText, Button, Card, EmptyState, Screen } from '@/components/ui';
import { useProcedures } from '@/hooks/useContent';
import { daysUntil } from '@/lib/dates';
import { useTaskStore } from '@/store/taskStore';
import type { Task } from '@/types/models';
import { colors, radius, shadows, spacing, touchTarget } from '@/theme';

type Filter = 'all' | 'urgent' | 'done';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Όλα' },
  { id: 'urgent', label: 'Επείγοντα' },
  { id: 'done', label: 'Ολοκληρωμένα' },
];

function byDueDate(a: Task, b: Task) {
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return a.dueDate.localeCompare(b.dueDate);
}

export default function Tasks() {
  const tasks = useTaskStore((s) => s.tasks);
  const { data: procedures } = useProcedures();
  const [filter, setFilter] = useState<Filter>('all');
  const { added } = useLocalSearchParams<{ added?: string }>();
  const addedTask = added ? tasks.find((t) => t.id === added) : undefined;
  const [dismissedAdded, setDismissedAdded] = useState<string | null>(null);

  const visible = useMemo(() => {
    const pending = tasks.filter((t) => t.status === 'pending').sort(byDueDate);
    if (filter === 'urgent') return pending.filter((t) => t.dueDate && daysUntil(t.dueDate) <= 3);
    if (filter === 'done') return tasks.filter((t) => t.status === 'done').sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
    return pending;
  }, [tasks, filter]);

  const counts = useMemo(
    () => ({
      all: tasks.filter((t) => t.status === 'pending').length,
      urgent: tasks.filter((t) => t.status === 'pending' && t.dueDate && daysUntil(t.dueDate) <= 3).length,
      done: tasks.filter((t) => t.status === 'done').length,
    }),
    [tasks],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="screenTitle">Οι εργασίες σου</AppText>
          <AppText variant="subtitle" color={colors.textSecondary} style={styles.mtXs}>
            Ό,τι χρειάζεται να θυμάσαι, σε ένα σημείο.
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Νέα εργασία"
          onPress={() => router.push('/tasks/new')}
          style={({ pressed }) => [styles.add, shadows.card, pressed && { backgroundColor: colors.primaryPressed }]}
        >
          <Plus size={24} color={colors.onPrimary} />
        </Pressable>
      </View>

      {addedTask && dismissedAdded !== addedTask.id ? (
        <Card tone="primary">
          <View style={styles.addedRow} accessibilityRole="alert">
            <CircleCheck size={22} color={colors.success} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">Προστέθηκε στις εργασίες σου</AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                {addedTask.remindAt ? 'Θα σου στείλουμε υπενθύμιση πριν από την προθεσμία.' : addedTask.title}
              </AppText>
            </View>
          </View>
          <View style={styles.addedActions}>
            <Button label="Άνοιγμα" size="md" onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: addedTask.id } })} style={styles.flex} />
            <Button label="Εντάξει" variant="ghost" size="md" onPress={() => setDismissedAdded(addedTask.id)} style={styles.flex} />
          </View>
        </Card>
      ) : null}

      <View style={styles.segment} accessibilityRole="tablist">
        {FILTERS.map((f) => {
          const selected = f.id === filter;
          return (
            <Pressable
              key={f.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={`${f.label}, ${counts[f.id]}`}
              onPress={() => setFilter(f.id)}
              style={[styles.segmentItem, selected && styles.segmentSelected]}
            >
              <AppText variant="label" color={selected ? colors.primary : colors.textSecondary} numberOfLines={1}>
                {f.label}
                {f.id === 'urgent' && counts.urgent > 0 ? ` (${counts.urgent})` : ''}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {visible.length === 0 ? (
        filter === 'done' ? (
          <EmptyState emoji="📋" title="Δεν έχεις ολοκληρώσει ακόμη εργασίες." />
        ) : (
          <EmptyState
            emoji="🎉"
            title="Είσαι εντάξει!"
            message="Αυτή τη στιγμή δεν έχεις εκκρεμείς εργασίες."
            actionLabel="Νέα εργασία"
            onAction={() => router.push('/tasks/new')}
          />
        )
      ) : (
        <View style={styles.list}>
          {visible.map((t) => (
            <TaskCard key={t.id} task={t} procedure={procedures?.find((p) => p.id === t.procedureId)} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  flex: { flex: 1 },
  mtXs: { marginTop: spacing.xs },
  add: { width: 52, height: 52, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.xs, gap: spacing.xs },
  segmentItem: { flexGrow: 1, flexBasis: 'auto', minHeight: touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, paddingHorizontal: spacing.xs },
  segmentSelected: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  list: { gap: spacing.md },
  addedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  addedActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
