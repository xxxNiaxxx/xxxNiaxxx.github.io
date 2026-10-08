import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing, touchTarget } from '@/theme';
import { AppText } from './AppText';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  onPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
  showChevron?: boolean;
  accessibilityHint?: string;
}

export function ListRow({ title, subtitle, icon: Icon, iconColor, onPress, right, destructive, showChevron = true, accessibilityHint }: ListRowProps) {
  const fg = destructive ? colors.danger : colors.text;
  const content = (
    <>
      {Icon ? (
        <View style={[styles.iconWrap, destructive && { backgroundColor: colors.dangerSoft }]}>
          <Icon size={20} color={destructive ? colors.danger : iconColor ?? colors.primary} />
        </View>
      ) : null}
      <View style={styles.text}>
        <AppText variant="bodyStrong" color={fg}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.textMuted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      {onPress && showChevron ? <ChevronRight size={20} color={colors.textMuted} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touchTarget + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: spacing.xxs },
});
