import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing, touchTarget } from '@/theme';
import { AppText } from './AppText';

export function SectionHeader({ title, subtitle, actionLabel, onAction }: { title: string; subtitle?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <AppText variant="sectionTitle">{title}</AppText>
        {subtitle ? <AppText variant="caption" color={colors.textMuted}>{subtitle}</AppText> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} hitSlop={8} style={styles.action}>
          <AppText variant="label" color={colors.primary}>
            {actionLabel}
          </AppText>
          <ChevronRight size={16} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  text: { flex: 1, gap: spacing.xxs },
  action: { flexDirection: 'row', alignItems: 'center', minHeight: touchTarget, gap: spacing.xxs },
});
