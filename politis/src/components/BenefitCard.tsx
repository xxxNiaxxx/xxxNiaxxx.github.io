import { router } from 'expo-router';
import { ArrowRight, CalendarDays } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import type { Benefit, EligibilityStatus } from '@/types/models';
import { formatDayMonth } from '@/lib/dates';
import { categoryLabels } from '@/lib/labels';
import { colors, radius, spacing } from '@/theme';
import { categoryIcons } from './categoryIcons';
import { EligibilityBadge } from './EligibilityBadge';
import { AppText, Button, Card } from './ui';

export interface BenefitCardProps {
  benefit: Benefit;
  status: EligibilityStatus;
  /** Show the «Έλεγχος επιλεξιμότητας» CTA (home). */
  showCta?: boolean;
}

export function BenefitCard({ benefit, status, showCta = false }: BenefitCardProps) {
  const Icon = categoryIcons[benefit.category];
  const open = () => router.push({ pathname: '/benefits/[id]', params: { id: benefit.id } });
  const subtitle =
    status === 'LIKELY_ELIGIBLE'
      ? 'Με βάση τα στοιχεία σου, φαίνεται ότι μπορεί να σε αφορά.'
      : status === 'NEEDS_MORE_INFO'
        ? 'Μπορεί να σε αφορά — χρειαζόμαστε μερικές ακόμη πληροφορίες.'
        : benefit.summary;
  return (
    <Card onPress={open} accessibilityLabel={`${benefit.title}. ${subtitle}`} accessibilityHint="Ανοίγει τις λεπτομέρειες της παροχής">
      <View style={styles.top}>
        <View style={styles.icon}>
          <Icon size={20} color={colors.primary} />
        </View>
        <AppText variant="caption" color={colors.textMuted} style={styles.flex}>
          {categoryLabels[benefit.category]}
        </AppText>
        {benefit.deadline ? (
          <View style={styles.deadline}>
            <CalendarDays size={14} color={colors.textMuted} />
            <AppText variant="caption" color={colors.textMuted}>
              έως {formatDayMonth(benefit.deadline)}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <AppText variant="cardTitle">{benefit.title}</AppText>
        <AppText color={colors.textSecondary}>{subtitle}</AppText>
        <EligibilityBadge status={status} />
      </View>
      {showCta ? (
        <Button
          label="Έλεγχος επιλεξιμότητας"
          variant="secondary"
          size="md"
          icon={ArrowRight}
          iconPosition="right"
          onPress={() => router.push({ pathname: '/eligibility/[id]', params: { id: benefit.id } })}
          style={styles.cta}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  icon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deadline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  body: { gap: spacing.sm, marginTop: spacing.md },
  cta: { marginTop: spacing.lg },
});
