import { router, useLocalSearchParams } from 'expo-router';
import { BellRing, CalendarDays, CircleCheck, ExternalLink, FileText, RotateCcw, Sparkles, Trash2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { OfficialSource } from '@/components/OfficialSource';
import { urgencyPresentation } from '@/components/urgency';
import { AppText, Badge, Button, Card, EmptyState, ListRow, Screen, SkeletonList, StackHeader } from '@/components/ui';
import { useBenefit, useProcedure } from '@/hooks/useContent';
import { confirmDialog, showMessage } from '@/lib/dialog';
import { formatDayMonth, formatFullDate, formatRelative, formatWeekdayDate, getUrgency } from '@/lib/dates';
import { openOfficialUrl } from '@/lib/linking';
import { taskService } from '@/services/taskService';
import { useTaskStore } from '@/store/taskStore';
import { colors, radius, spacing } from '@/theme';

export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === id));
  const { data: procedure, isLoading: procLoading } = useProcedure(task?.procedureId);
  const { data: benefit } = useBenefit(task?.benefitId);

  if (!task) {
    return (
      <Screen header={<StackHeader />}>
        <EmptyState emoji="🗂️" title="Η εργασία δεν βρέθηκε." message="Μπορεί να έχει διαγραφεί." actionLabel="Οι εργασίες μου" onAction={() => router.replace('/(tabs)/tasks')} />
      </Screen>
    );
  }

  const done = task.status === 'done';
  const urgency = urgencyPresentation[getUrgency(task.dueDate)];

  const remind = async () => {
    const date = await taskService.remindTomorrow(task.id);
    if (date) showMessage('Έγινε!', `Θα σου το θυμίσουμε αύριο, ${formatDayMonth(date.toISOString())}.`);
  };

  const remove = async () => {
    const ok = await confirmDialog('Διαγραφή εργασίας', `Θέλεις να διαγράψεις την εργασία «${task.title}»;`, 'Διαγραφή', true);
    if (!ok) return;
    await taskService.remove(task.id);
    router.back();
  };

  return (
    <Screen
      header={<StackHeader title="Εργασία" />}
      edges={['top', 'bottom']}
      footer={
        <>
          {procedure ? (
            <Button
              label="Άνοιγμα επίσημης υπηρεσίας"
              icon={ExternalLink}
              onPress={() => openOfficialUrl(procedure.officialUrl, { contentId: procedure.id, contentType: 'procedure' })}
            />
          ) : null}
          {done ? (
            <Button label="Επαναφορά σε εκκρεμότητα" icon={RotateCcw} variant="secondary" onPress={() => taskService.reopen(task.id)} />
          ) : (
            <Button label="Το ολοκλήρωσα" icon={CircleCheck} variant={procedure ? 'secondary' : 'primary'} onPress={() => taskService.complete(task.id)} />
          )}
        </>
      }
    >
      <View style={styles.head}>
        <View style={styles.badges}>
          {done ? <Badge label="Ολοκληρώθηκε" tone="success" icon={CircleCheck} /> : <Badge label={urgency.label} tone={urgency.tone} symbol={urgency.symbol} />}
          {task.isMock ? <Badge label="Παράδειγμα" tone="neutral" /> : null}
        </View>
        <AppText variant="screenTitle">{task.title}</AppText>
        {task.description ? (
          <AppText variant="subtitle" color={colors.textSecondary}>
            {task.description}
          </AppText>
        ) : null}
      </View>

      <Card>
        <View style={styles.infoRow}>
          <CalendarDays size={20} color={colors.primary} />
          <View style={styles.flex}>
            <AppText variant="caption" color={colors.textMuted}>
              Προθεσμία
            </AppText>
            <AppText variant="bodyStrong">{task.dueDate ? `${formatWeekdayDate(task.dueDate)} · ${formatRelative(task.dueDate)}` : 'Χωρίς προθεσμία'}</AppText>
          </View>
        </View>
        {task.remindAt && !done ? (
          <View style={[styles.infoRow, styles.mtMd]}>
            <BellRing size={20} color={colors.primary} />
            <View style={styles.flex}>
              <AppText variant="caption" color={colors.textMuted}>
                Υπενθύμιση
              </AppText>
              <AppText variant="bodyStrong">{formatFullDate(task.remindAt)}</AppText>
            </View>
          </View>
        ) : null}
        {done && task.completedAt ? (
          <View style={[styles.infoRow, styles.mtMd]}>
            <CircleCheck size={20} color={colors.success} />
            <AppText variant="bodyStrong">Ολοκληρώθηκε στις {formatFullDate(task.completedAt)}</AppText>
          </View>
        ) : null}
      </Card>

      {!done ? <Button label="Υπενθύμισέ μου αύριο" icon={BellRing} variant="secondary" onPress={remind} /> : null}

      {procLoading && task.procedureId ? <SkeletonList count={1} /> : null}
      {procedure ? (
        <View style={styles.section}>
          <AppText variant="sectionTitle">Σχετική διαδικασία</AppText>
          <View style={styles.listCard}>
            <ListRow
              icon={FileText}
              title={procedure.title}
              subtitle={`${procedure.steps.length} βήματα · ${procedure.estimatedTime}`}
              onPress={() => router.push({ pathname: '/procedures/[id]', params: { id: procedure.id } })}
            />
            {benefit ? (
              <>
                <View style={styles.sep} />
                <ListRow icon={Sparkles} title={benefit.title} subtitle="Σχετική παροχή" onPress={() => router.push({ pathname: '/benefits/[id]', params: { id: benefit.id } })} />
              </>
            ) : null}
          </View>
          <View style={styles.section}>
            <AppText variant="cardTitle">Τα βήματα με μια ματιά</AppText>
            {procedure.steps.map((s) => (
              <AppText key={s.id} color={colors.textSecondary}>
                {s.order}. {s.title}
              </AppText>
            ))}
          </View>
          <OfficialSource source={procedure.source} contentId={procedure.id} contentType="procedure" />
        </View>
      ) : null}

      <Button label="Διαγραφή εργασίας" icon={Trash2} variant="danger" onPress={remove} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: spacing.md },
  badges: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  mtMd: { marginTop: spacing.md },
  section: { gap: spacing.md },
  listCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  sep: { height: 1, backgroundColor: colors.border, marginLeft: 64 },
});
