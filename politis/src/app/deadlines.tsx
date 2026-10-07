import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { DeadlineRow } from '@/components/DeadlineRow';
import { AppText, EmptyState, ErrorState, Screen, SectionHeader, SkeletonList, StackHeader } from '@/components/ui';
import { useRecommendations } from '@/hooks/useRecommendations';
import { buildDeadlines } from '@/lib/deadlines';
import { daysUntil } from '@/lib/dates';
import { useTaskStore } from '@/store/taskStore';
import { colors, radius, spacing } from '@/theme';
import type { Deadline } from '@/types/models';

function Group({ title, items }: { title: string; items: Deadline[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader title={title} />
      <View style={styles.listCard}>
        {items.map((d, i) => (
          <View key={d.id} style={i > 0 ? styles.sep : undefined}>
            <DeadlineRow deadline={d} />
          </View>
        ))}
      </View>
    </View>
  );
}

export default function Deadlines() {
  const tasks = useTaskStore((s) => s.tasks);
  const { recommendations, isLoading, isError, refetch } = useRecommendations();
  const all = useMemo(() => buildDeadlines(tasks, recommendations.map((r) => r.benefit)), [tasks, recommendations]);

  const overdue = all.filter((d) => daysUntil(d.date) < 0);
  const week = all.filter((d) => daysUntil(d.date) >= 0 && daysUntil(d.date) <= 7);
  const later = all.filter((d) => daysUntil(d.date) > 7);

  return (
    <Screen header={<StackHeader />}>
      <View style={styles.head}>
        <AppText variant="screenTitle">Όλες οι προθεσμίες</AppText>
        <AppText variant="subtitle" color={colors.textSecondary}>
          Από τις εργασίες σου και τις παροχές που μπορεί να σε αφορούν.
        </AppText>
      </View>
      {isLoading ? (
        <SkeletonList count={2} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : all.length === 0 ? (
        <EmptyState emoji="🎉" title="Είσαι εντάξει!" message="Δεν υπάρχουν προθεσμίες αυτή τη στιγμή." />
      ) : (
        <>
          <Group title="Έληξαν πρόσφατα" items={overdue} />
          <Group title="Αυτή την εβδομάδα" items={week} />
          <Group title="Αργότερα" items={later} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: spacing.sm },
  section: { gap: spacing.md },
  listCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  sep: { borderTopWidth: 1, borderTopColor: colors.border },
});
