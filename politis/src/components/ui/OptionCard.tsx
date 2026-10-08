import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

export interface OptionCardProps {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  emoji?: string;
}

/** Large, single-choice option used in onboarding and the eligibility questionnaire. */
export function OptionCard({ label, description, selected, onPress, emoji }: OptionCardProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && !selected && { backgroundColor: colors.surfaceMuted }]}
    >
      {emoji ? <AppText style={styles.emoji}>{emoji}</AppText> : null}
      <View style={styles.text}>
        <AppText variant="bodyStrong" color={selected ? colors.primary : colors.text}>
          {label}
        </AppText>
        {description ? (
          <AppText variant="caption" color={colors.textMuted}>
            {description}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <Check size={16} color={colors.onPrimary} strokeWidth={3} /> : null}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  emoji: { fontSize: 22, lineHeight: 28 },
  text: { flex: 1, gap: spacing.xxs },
  radio: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
});
