import { router } from 'expo-router';
import { BellRing, CalendarDays, CircleCheck, FileText } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import type { Procedure, Task } from '@/types/models';
import { formatDayMonth, formatRelative, formatWeekdayDate, getUrgency } from '@/lib/dates';
import { showMessage } from '@/lib/dialog';
import { taskService } from '@/services/taskService';
import { colors, spacing } from '@/theme';
import { urgencyPresentation } from './urgency';
import { AppText, Badge, Button, Card } from './ui';

export interface TaskCardProps {
  task: Task;
  procedure?: Procedure | null;
  compact?: boolean;
}

export function TaskCard({ task, procedure, compact = false }: TaskCardProps) {
  const done = task.status === 'done';
  const urgency = done ? null : urgencyPresentation[getUrgency(task.dueDate)];
  const open = () => router.push({ pathname: '/tasks/[id]', params: { id: task.id } });

  const remind = async () => {
    const date = await taskService.remindTomorrow(task.id);
    if (date) showMessage('Έγινε!', `Θα σου το θυμίσουμε αύριο, ${formatDayMonth(date.toISOString())}.`);
  };

  return (
    <Card onPress={open} accessibilityLabel={`Εργασία: ${task.title}`} accessibilityHint="Ανοίγει την εργασία">
      <View style={styles.body}>
        <View style={styles.badges}>
          {done ? <Badge label="Ολοκληρώθηκε" tone="success" icon={CircleCheck} /> : urgency ? <Badge label={urgency.label} tone={urgency.tone} symbol={urgency.symbol} /> : null}
          {task.remindAt && !done ? <Badge label="Υπενθύμιση" tone="primary" icon={BellRing} /> : null}
        </View>
        <AppText variant="cardTitle" style={done && styles.doneTitle}>
          {task.title}
        </AppText>
        {task.description && !compact ? <AppText color={colors.textSecondary}>{task.description}</AppText> : null}
        {task.dueDate ? (
          <View style={styles.meta}>
            <CalendarDays size={16} color={colors.textMuted} />
            <AppText variant="caption" color={colors.textSecondary}>
              {formatWeekdayDate(task.dueDate)}
              {!done ? ` · ${formatRelative(task.dueDate)}` : ''}
            </AppText>
          </View>
        ) : null}
        {procedure ? (
          <View style={styles.meta}>
            <FileText size={16} color={colors.textMuted} />
            <AppText variant="caption" color={colors.textSecondary} style={styles.flex}>
              Διαδικασία: {procedure.title}
            </AppText>
          </View>
        ) : null}
      </View>
      {!compact ? (
        <View style={styles.actions}>
          <Button label="Άνοιγμα" variant="secondary" size="md" onPress={open} style={styles.flex} />
          {!done ? <Button label="Το ολοκλήρωσα" size="md" onPress={() => taskService.complete(task.id)} style={styles.flex} /> : null}
        </View>
      ) : null}
      {!compact && !done ? <Button label="Υπενθύμισέ μου αύριο" variant="ghost" size="md" icon={BellRing} onPress={remind} style={styles.remind} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  doneTitle: { color: colors.textMuted, textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  remind: { marginTop: spacing.xs },
});
