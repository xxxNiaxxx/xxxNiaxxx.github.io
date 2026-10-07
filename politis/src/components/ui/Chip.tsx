import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing, touchTarget } from '@/theme';
import { AppText } from './AppText';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
}

export function Chip({ label, selected = false, onPress, icon: Icon }: ChipProps) {
  const fg = selected ? colors.onPrimary : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selected : styles.unselected,
        pressed && !selected && { backgroundColor: colors.surfaceMuted },
      ]}
    >
      {Icon ? <Icon size={18} color={selected ? colors.onPrimary : colors.primary} /> : null}
      <AppText variant="label" color={fg}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  unselected: { backgroundColor: colors.surface, borderColor: colors.border },
});
