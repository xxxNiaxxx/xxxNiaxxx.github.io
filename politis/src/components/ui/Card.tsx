import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadows, spacing } from '@/theme';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'muted' | 'primary';
}

const toneBg = { default: colors.surface, muted: colors.surfaceMuted, primary: colors.primarySoft } as const;

export function Card({ children, onPress, accessibilityLabel, accessibilityHint, style, tone = 'default' }: CardProps) {
  const base = [styles.card, { backgroundColor: toneBg[tone] }, tone === 'default' && shadows.card, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [...base, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
