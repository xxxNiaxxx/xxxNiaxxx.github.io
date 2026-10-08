import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { colors, radius, shadows, spacing } from '@/theme';
import { AppText } from './ui';

/** Floating «✨ Ρώτησέ με» assistant CTA. */
export function AssistantFab() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ρώτησέ με"
      accessibilityHint="Ανοίγει τον βοηθό"
      onPress={() => router.push('/(tabs)/assistant')}
      style={({ pressed }) => [styles.fab, shadows.floating, pressed && { backgroundColor: colors.primaryPressed }]}
    >
      <Sparkles size={20} color={colors.onPrimary} />
      <AppText variant="button" color={colors.onPrimary}>
        Ρώτησέ με
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
});
