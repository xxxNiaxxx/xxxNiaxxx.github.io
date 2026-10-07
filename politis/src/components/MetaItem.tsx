import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './ui';

export function MetaItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <View style={styles.item} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.icon}>
        <Icon size={18} color={colors.primary} />
      </View>
      <View style={styles.text}>
        <AppText variant="caption" color={colors.textMuted}>
          {label}
        </AppText>
        <AppText variant="bodyStrong">{value}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, minWidth: 150 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
});
