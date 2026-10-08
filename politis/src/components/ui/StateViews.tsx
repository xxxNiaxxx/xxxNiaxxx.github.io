import { RefreshCw } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';

export interface EmptyStateProps {
  emoji?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ emoji, title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.box}>
      {emoji ? <AppText style={styles.emoji}>{emoji}</AppText> : null}
      <AppText variant="cardTitle" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText color={colors.textSecondary} align="center">
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" fullWidth={false} size="md" /> : null}
    </View>
  );
}

/** User-facing error. Never shows technical details — those go to the logger. */
export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <View style={styles.box} accessibilityRole="alert">
      <AppText style={styles.emoji}>😕</AppText>
      <AppText variant="cardTitle" align="center">
        Κάτι πήγε στραβά.
      </AppText>
      <AppText color={colors.textSecondary} align="center">
        Δεν μπορέσαμε να φορτώσουμε αυτή την πληροφορία.
      </AppText>
      {onRetry ? <Button label="Δοκίμασε ξανά" icon={RefreshCw} onPress={onRetry} variant="secondary" fullWidth={false} size="md" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: { fontSize: 40, lineHeight: 50 },
});
