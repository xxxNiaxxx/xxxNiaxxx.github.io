import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type DimensionValue } from 'react-native';
import { colors, radius, spacing } from '@/theme';

export function SkeletonBlock({ width = '100%', height = 16, rounded = radius.sm }: { width?: DimensionValue; height?: number; rounded?: number }) {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={{ width, height, borderRadius: rounded, backgroundColor: colors.skeleton, opacity }} />;
}

export function SkeletonCard() {
  return (
    <View style={styles.card} accessibilityLabel="Φόρτωση" accessibilityRole="progressbar">
      <SkeletonBlock width="40%" height={14} />
      <SkeletonBlock width="85%" height={20} />
      <SkeletonBlock width="70%" height={14} />
      <SkeletonBlock width="50%" height={36} rounded={radius.md} />
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: spacing.md }}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
