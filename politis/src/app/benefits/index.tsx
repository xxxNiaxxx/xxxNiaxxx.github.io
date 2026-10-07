import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { BenefitCard } from '@/components/BenefitCard';
import { AppText, EmptyState, ErrorState, Screen, SectionHeader, SkeletonList, StackHeader } from '@/components/ui';
import { useBenefits } from '@/hooks/useContent';
import { evaluateBenefit } from '@/lib/eligibility';
import { useAppStore } from '@/store/appStore';
import { useProfileStore } from '@/store/profileStore';
import { colors, spacing } from '@/theme';

export default function BenefitsList() {
  const { saved } = useLocalSearchParams<{ saved?: string }>();
  const onlySaved = saved === '1';
  const savedIds = useAppStore((s) => s.savedBenefitIds);
  const profile = useProfileStore((s) => s.profile);
  const { data, isLoading, isError, refetch } = useBenefits();

  const groups = useMemo(() => {
    const items = (data ?? [])
      .filter((b) => (onlySaved ? savedIds.includes(b.id) : true))
      .map((benefit) => ({ benefit, status: evaluateBenefit(benefit, profile).status }));
    return {
      likely: items.filter((i) => i.status === 'LIKELY_ELIGIBLE'),
      check: items.filter((i) => i.status === 'NEEDS_MORE_INFO' || i.status === 'UNKNOWN'),
      other: items.filter((i) => i.status === 'UNLIKELY'),
    };
  }, [data, profile, onlySaved, savedIds]);

  const total = groups.likely.length + groups.check.length + groups.other.length;

  return (
    <Screen header={<StackHeader />}>
      <View style={styles.head}>
        <AppText variant="screenTitle">{onlySaved ? 'Αποθηκευμένες παροχές' : 'Παροχές & προγράμματα'}</AppText>
        <AppText variant="subtitle" color={colors.textSecondary}>
          Ταξινομημένες με βάση τα στοιχεία του προφίλ σου.
        </AppText>
      </View>
      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : total === 0 ? (
        <EmptyState emoji={onlySaved ? '🔖' : '🔎'} title={onlySaved ? 'Δεν έχεις αποθηκεύσει παροχές ακόμη.' : 'Δεν βρήκαμε κάτι που να ταιριάζει στα στοιχεία σου αυτή τη στιγμή.'} />
      ) : (
        <>
          {groups.likely.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title="Πιθανόν να σε αφορούν" />
              {groups.likely.map(({ benefit, status }) => (
                <BenefitCard key={benefit.id} benefit={benefit} status={status} />
              ))}
            </View>
          ) : null}
          {groups.check.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title="Χρειάζονται έλεγχο" />
              {groups.check.map(({ benefit, status }) => (
                <BenefitCard key={benefit.id} benefit={benefit} status={status} />
              ))}
            </View>
          ) : null}
          {groups.other.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title="Άλλα προγράμματα" />
              {groups.other.map(({ benefit, status }) => (
                <BenefitCard key={benefit.id} benefit={benefit} status={status} />
              ))}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: spacing.sm },
  section: { gap: spacing.md },
});
