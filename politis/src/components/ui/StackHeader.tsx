import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing, touchTarget } from '@/theme';
import { AppText } from './AppText';

export interface StackHeaderProps {
  title?: string;
  right?: ReactNode;
  onBack?: () => void;
  showBack?: boolean;
}

export function StackHeader({ title, right, onBack, showBack = true }: StackHeaderProps) {
  const goBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };
  return (
    <View style={styles.row}>
      {showBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Πίσω"
          onPress={goBack}
          hitSlop={8}
          style={({ pressed }) => [styles.back, pressed && { backgroundColor: colors.surfaceMuted }]}
        >
          <ChevronLeft size={26} color={colors.text} />
        </Pressable>
      ) : (
        <View style={styles.back} />
      )}
      <AppText variant="bodyStrong" numberOfLines={1} style={styles.title} align="center">
        {title ?? ''}
      </AppText>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: touchTarget + spacing.sm,
  },
  back: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1 },
  right: { minWidth: touchTarget, alignItems: 'flex-end' },
});
