import { useFocusEffect, router } from 'expo-router';
import { ArrowRight, Bell, CalendarDays, Sparkles, UserPen } from 'lucide-react-native';
import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AssistantFab } from '@/components/AssistantButton';
import { BenefitCard } from '@/components/BenefitCard';
import { DeadlineRow } from '@/components/DeadlineRow';
import { urgencyPresentation } from '@/components/urgency';
import { AppText, Badge, Button, Card, EmptyState, ErrorState, Screen, SectionHeader, SkeletonList } from '@/components/ui';
import { useRecommendations } from '@/hooks/useRecommendations';
import { analytics } from '@/lib/analytics';
import { buildDeadlines } from '@/lib/deadlines';
import { daysUntil, formatDayMonth, getUrgency, greetingForHour } from '@/lib/dates';
import { useNotificationStore } from '@/store/notificationStore';
import { useProfileStore } from '@/store/profileStore';
import { useTaskStore } from '@/store/taskStore';
import { colors, radius, spacing, touchTarget } from '@/theme';
import type { Task } from '@/types/models';

function attentionCopy(count: number): string {
  if (count === 0) return 'Όλα είναι εντάξει αυτή τη στιγμή. 🎉';
  if (count === 1) return '1 πράγμα χρειάζεται την προσοχή σου.';
  return `${count} πράγματα χρειάζονται την προσοχή σου.`;
}

function ActionCard({ task }: { task: Task }) {
  const urgency = urgencyPresentation[getUrgency(task.dueDate)];
  const overdue = task.dueDate ? daysUntil(task.dueDate) < 0 : false;
  return (
    <Card onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: task.id } })} accessibilityLabel={task.title}>
      <View style={styles.actionTop}>
        <Badge label={urgency.label} tone={urgency.tone} symbol={urgency.symbol} />
        {task.dueDate ? (
          <View style={styles.inline}>
            <CalendarDays size={16} color={colors.textSecondary} />
            <AppText variant="captionStrong" color={colors.textSecondary}>
              {formatDayMonth(task.dueDate)}
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText variant="cardTitle" style={styles.mtSm}>
        {task.title}
      </AppText>
      <AppText color={colors.textSecondary} style={styles.mtXs}>
        {overdue ? 'Η προθεσμία έχει λήξει — έλεγξε αν μπορείς ακόμη να κάνεις κάτι.' : 'Η προθεσμία πλησιάζει.'}
      </AppText>
      <Button
        label="Δες τι χρειάζεται"
        size="md"
        icon={ArrowRight}
        iconPosition="right"
        style={styles.mtLg}
        onPress={() =>
          task.procedureId
            ? router.push({ pathname: '/procedures/[id]', params: { id: task.procedureId, taskId: task.id } })
            : router.push({ pathname: '/tasks/[id]', params: { id: task.id } })
        }
      />
    </Card>
  );
}

export default function Home() {
  const profile = useProfileStore((s) => s.profile);
  const tasks = useTaskStore((s) => s.tasks);
  const unread = useNotificationStore((s) => s.items.filter((i) => !i.read).length);
  const { recommendations, data: benefits, isLoading, isError, refetch } = useRecommendations();

  useFocusEffect(
    useCallback(() => {
      analytics.track('home_viewed');
    }, []),
  );

  const urgentTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'pending' && t.dueDate && daysUntil(t.dueDate) <= 7)
        .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')),
    [tasks],
  );

  const deadlines = useMemo(
    () => buildDeadlines(tasks, recommendations.map((r) => r.benefit)).filter((d) => daysUntil(d.date) >= 0),
    [tasks, recommendations],
  );

  const missingProfile = !profile?.ageRange || !profile?.employmentStatus || profile?.children === undefined || !profile?.housingStatus;
  const greeting = `${greetingForHour(new Date().getHours())}${profile?.firstName ? `, ${profile.firstName}` : ''} 👋`;

  return (
    <Screen overlay={<AssistantFab />} contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="screenTitle">{greeting}</AppText>
          <AppText variant="subtitle" color={colors.textSecondary} style={styles.mtXs}>
            Αυτή είναι η εβδομάδα σου
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={unread > 0 ? `Ειδοποιήσεις, ${unread} νέες` : 'Ειδοποιήσεις'}
          onPress={() => router.push('/notifications')}
          style={({ pressed }) => [styles.bell, pressed && { backgroundColor: colors.surfaceMuted }]}
        >
          <Bell size={22} color={colors.text} />
          {unread > 0 ? (
            <View style={styles.dot}>
              <AppText variant="captionStrong" color={colors.onPrimary} style={styles.dotText}>
                {unread > 9 ? '9+' : unread}
              </AppText>
            </View>
          ) : null}
        </Pressable>
      </View>

      <Card tone="primary">
        <AppText variant="cardTitle" color={colors.primary}>
          {attentionCopy(urgentTasks.length)}
        </AppText>
      </Card>

      {missingProfile ? (
        <Card onPress={() => router.push('/onboarding')} accessibilityLabel="Συμπλήρωσε το προφίλ σου">
          <View style={styles.inline}>
            <UserPen size={20} color={colors.primary} />
            <AppText variant="bodyStrong" style={styles.flex}>
              Συμπλήρωσε το προφίλ σου για πιο ακριβείς προτάσεις.
            </AppText>
          </View>
        </Card>
      ) : null}

      {urgentTasks.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Χρειάζεται ενέργεια" actionLabel="Όλες" onAction={() => router.push('/(tabs)/tasks')} />
          {urgentTasks.slice(0, 3).map((t) => (
            <ActionCard key={t.id} task={t} />
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          title="Μπορεί να σε αφορά"
          actionLabel={recommendations.length > 3 ? 'Όλες' : undefined}
          onAction={() => router.push('/benefits')}
        />
        {isLoading ? (
          <SkeletonList count={2} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : recommendations.length === 0 ? (
          <EmptyState emoji="🔎" title="Δεν βρήκαμε κάτι που να ταιριάζει στα στοιχεία σου αυτή τη στιγμή." actionLabel="Δες όλες τις παροχές" onAction={() => router.push('/benefits')} />
        ) : (
          recommendations.slice(0, 3).map(({ benefit, result }) => <BenefitCard key={benefit.id} benefit={benefit} status={result.status} showCta />)
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Επόμενες προθεσμίες" />
        {isLoading && !benefits ? (
          <SkeletonList count={1} />
        ) : deadlines.length === 0 ? (
          <EmptyState emoji="📅" title="Καμία προθεσμία στον ορίζοντα." />
        ) : (
          <View style={styles.listCard}>
            {deadlines.slice(0, 4).map((d, i) => (
              <View key={d.id} style={i > 0 ? styles.separator : undefined}>
                <DeadlineRow deadline={d} />
              </View>
            ))}
          </View>
        )}
        <Button label="Όλες οι προθεσμίες" variant="secondary" onPress={() => router.push('/deadlines')} />
      </View>

      <Card tone="muted" onPress={() => router.push('/(tabs)/assistant')} accessibilityLabel="Ρώτησέ με">
        <View style={styles.inline}>
          <View style={styles.sparkle}>
            <Sparkles size={22} color={colors.accent} />
          </View>
          <View style={styles.flex}>
            <AppText variant="cardTitle">✨ Ρώτησέ με</AppText>
            <AppText color={colors.textSecondary}>Π.χ. «Τι πρέπει να κάνω αυτή την εβδομάδα;»</AppText>
          </View>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 110 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  flex: { flex: 1 },
  bell: { width: touchTarget, height: touchTarget, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  dot: { position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  dotText: { fontSize: 11, lineHeight: 14 },
  section: { gap: spacing.md },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  mtXs: { marginTop: spacing.xs },
  mtSm: { marginTop: spacing.md },
  mtLg: { marginTop: spacing.lg },
  listCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  separator: { borderTopWidth: 1, borderTopColor: colors.border },
  sparkle: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
});
