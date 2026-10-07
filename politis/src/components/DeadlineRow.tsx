import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Deadline } from '@/types/models';
import { formatRelative, getUrgency } from '@/lib/dates';
import { colors, radius, spacing, toneColors, touchTarget } from '@/theme';
import { urgencyPresentation } from './urgency';
import { AppText } from './ui';

const MONTHS_SHORT = ['ΙΑΝ', 'ΦΕΒ', 'ΜΑΡ', 'ΑΠΡ', 'ΜΑΪ', 'ΙΟΥΝ', 'ΙΟΥΛ', 'ΑΥΓ', 'ΣΕΠ', 'ΟΚΤ', 'ΝΟΕ', 'ΔΕΚ'];

export function DeadlineRow({ deadline }: { deadline: Deadline }) {
  const d = new Date(deadline.date);
  const u = urgencyPresentation[getUrgency(deadline.date)];
  const tone = toneColors[u.tone];
  const kind = deadline.kind === 'task' ? 'Εργασία' : 'Προθεσμία παροχής';
  const relative = formatRelative(deadline.date);
  const onPress = () => {
    if (deadline.taskId) router.push({ pathname: '/tasks/[id]', params: { id: deadline.taskId } });
    else if (deadline.benefitId) router.push({ pathname: '/benefits/[id]', params: { id: deadline.benefitId } });
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${deadline.title}, ${relative}, ${kind}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}
    >
      <View style={[styles.date, { backgroundColor: tone.bg }]}>
        <AppText variant="captionStrong" color={tone.fg}>
          {MONTHS_SHORT[d.getMonth()]}
        </AppText>
        <AppText variant="cardTitle" color={tone.fg}>
          {d.getDate()}
        </AppText>
      </View>
      <View style={styles.text}>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {deadline.title}
        </AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {relative} · {kind}
        </AppText>
      </View>
      <ChevronRight size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: touchTarget + spacing.md,
  },
  date: { width: 52, paddingVertical: spacing.xs, borderRadius: radius.md, alignItems: 'center' },
  text: { flex: 1, gap: spacing.xxs },
});
