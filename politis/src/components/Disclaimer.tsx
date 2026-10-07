import { Info } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './ui';

export const ELIGIBILITY_DISCLAIMER =
  'Αυτός ο έλεγχος είναι ενημερωτικός. Η τελική απόφαση λαμβάνεται από τον αρμόδιο φορέα.';

export const NOT_GOVERNMENT_NOTICE =
  'Το Politis είναι ενημερωτικός βοηθός και δεν αποτελεί κρατική υπηρεσία. Για επίσημες αιτήσεις χρησιμοποίησε πάντα τις επίσημες πηγές.';

export function Disclaimer({ text = ELIGIBILITY_DISCLAIMER }: { text?: string }) {
  return (
    <View style={styles.box} accessibilityRole="text">
      <Info size={18} color={colors.textSecondary} />
      <AppText variant="caption" color={colors.textSecondary} style={styles.text}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.neutralSoft,
  },
  text: { flex: 1 },
});
