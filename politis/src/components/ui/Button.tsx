import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing, touchTarget } from '@/theme';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'md' | 'lg';
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

const variantStyles: Record<Variant, { bg: string; bgPressed: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, bgPressed: colors.primaryPressed, fg: colors.onPrimary },
  accent: { bg: colors.accent, bgPressed: colors.primaryPressed, fg: colors.onPrimary },
  secondary: { bg: colors.surface, bgPressed: colors.surfaceMuted, fg: colors.primary, border: colors.primaryBorder },
  ghost: { bg: 'transparent', bgPressed: colors.primarySoft, fg: colors.primary },
  danger: { bg: colors.surface, bgPressed: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = true,
  size = 'lg',
  accessibilityHint,
  style,
}: ButtonProps) {
  const v = variantStyles[variant];
  const isDisabled = disabled || loading;
  const iconEl = Icon ? <Icon size={20} color={v.fg} strokeWidth={2.2} /> : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        { backgroundColor: pressed ? v.bgPressed : v.bg, borderColor: v.border ?? 'transparent' },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.content}>
          {iconPosition === 'left' && iconEl}
          <AppText variant="button" color={v.fg} numberOfLines={2} align="center">
            {label}
          </AppText>
          {iconPosition === 'right' && iconEl}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  lg: { minHeight: 52, paddingVertical: spacing.md },
  md: { minHeight: touchTarget, paddingVertical: spacing.sm },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.5 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
