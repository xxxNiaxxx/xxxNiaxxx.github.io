import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, spacing } from '@/theme';
import { AppText } from './ui';

export function BulletList({ items, icon: Icon, iconColor = colors.primary }: { items: string[]; icon?: LucideIcon; iconColor?: string }) {
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item} style={styles.row}>
          {Icon ? <Icon size={18} color={iconColor} style={styles.icon} /> : <AppText color={iconColor}>•</AppText>}
          <AppText style={styles.text}>{item}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  icon: { marginTop: 3 },
  text: { flex: 1 },
});
