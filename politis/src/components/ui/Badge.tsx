import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { radius, spacing, toneColors, type Tone } from '@/theme';
import { AppText } from './AppText';

export interface BadgeProps {
  label: string;
  tone?: Tone;
  icon?: LucideIcon;
  /** Text symbol (e.g. 🟢) so meaning never depends on color alone. */
  symbol?: string;
}

export function Badge({ label, tone = 'neutral', icon: Icon, symbol }: BadgeProps) {
  const c = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]} accessibilityRole="text" accessibilityLabel={label}>
      {Icon ? <Icon size={14} color={c.fg} strokeWidth={2.4} /> : null}
      {symbol ? <AppText variant="caption">{symbol}</AppText> : null}
      <AppText variant="captionStrong" color={c.fg} numberOfLines={2}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    maxWidth: '100%',
  },
});
