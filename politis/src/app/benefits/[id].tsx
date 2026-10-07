import { router, useLocalSearchParams } from 'expo-router';
import { Bookmark, BookmarkCheck, CalendarDays, CircleAlert, CircleCheck, CircleHelp, ExternalLink, FileText, ListChecks } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { BulletList } from '@/components/BulletList';
import { categoryIcons } from '@/components/categoryIcons';
import { Disclaimer, ELIGIBILITY_DISCLAIMER } from '@/components/Disclaimer';
import { EligibilityBadge } from '@/components/EligibilityBadge';
import { OfficialSource } from '@/components/OfficialSource';
import { AppText, Badge, Button, Card, EmptyState, ErrorState, ListRow, Screen, SkeletonList, StackHeader } from '@/components/ui';
import { useBenefit, useProcedure } from '@/hooks/useContent';
import { analytics } from '@/lib/analytics';
import { formatFullDate, formatRelative } from '@/lib/dates';
import { evaluateBenefit } from '@/lib/eligibility';
import { benefitStatusLabels, categoryLabels, profileFieldLabels } from '@/lib/labels';
import { openOfficialUrl } from '@/lib/linking';
import { useAppStore } from '@/store/appStore';
import { useProfileStore } from '@/store/profileStore';
import { colors, radius, spacing } from '@/theme';

export default function BenefitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: benefit, isLoading, isError, refetch } = useBenefit(id);
  const { data: procedure } = useProcedure(benefit?.procedureId);
  const profile = useProfileStore((s) => s.profile);
  const saved = useAppStore((s) => (id ? s.savedBenefitIds.includes(id) : false));
  const toggleSaved = useAppStore((s) => s.toggleSavedBenefit);

  useEffect(() => {
    if (id) analytics.track('benefit_viewed', { contentId: id, contentType: 'benefit' });
  }, [id]);

  const result = useMemo(() => (benefit ? evaluateBenefit(benefit, profile) : null), [benefit, profile]);

  if (isLoading) {
    return (
      <Screen header={<StackHeader />}>
        <SkeletonList count={3} />
      </Screen>
    );
  }
  if (isError) {
    return (
      <Screen header={<StackHeader />}>
        <ErrorState onRetry={refetch} />
      </Screen>
    );
  }
  if (!benefit || !result) {
    return (
      <Screen header={<StackHeader />}>
        <EmptyState emoji="🔎" title="Δεν βρήκαμε αυτή την παροχή." />
      </Screen>
    );
  }

  const Icon = categoryIcons[benefit.category];
  const passed = result.outcomes.filter((o) => o.outcome === 'pass');
  const failed = result.outcomes.filter((o) => o.outcome === 'fail' && o.rule.required);
  const missing = result.outcomes.filter((o) => o.outcome === 'missing');

  return (
    <Screen
      header={<StackHeader title={categoryLabels[benefit.category]} />}
      edges={['top', 'bottom']}
      footer={
        <>
          <Button label="Έλεγχος επιλεξιμότητας" onPress={() => router.push({ pathname: '/eligibility/[id]', params: { id: benefit.id } })} />
          <Button
            label={saved ? 'Αποθηκεύτηκε' : 'Αποθήκευση'}
            icon={saved ? BookmarkCheck : Bookmark}
            variant="secondary"
            size="md"
            onPress={() => toggleSaved(benefit.id)}
          />
        </>
      }
    >
      <View style={styles.head}>
        <View style={styles.icon}>
          <Icon size={26} color={colors.primary} />
        </View>
        <AppText variant="screenTitle">{benefit.title}</AppText>
        <EligibilityBadge status={result.status} />
        <View style={styles.metaRow}>
          <Badge label={benefitStatusLabels[benefit.status]} tone={benefit.status === 'open' ? 'success' : benefit.status === 'upcoming' ? 'primary' : 'neutral'} />
          {benefit.deadline ? <Badge label={`Προθεσμία: ${formatFullDate(benefit.deadline)} · ${formatRelative(benefit.deadline)}`} tone="warning" icon={CalendarDays} /> : null}
        </View>
      </View>

      <AppText variant="subtitle">{benefit.description}</AppText>

      <Card>
        <AppText variant="cardTitle">Γιατί μπορεί να σε αφορά</AppText>
        <View style={styles.gapSm}>
          {passed.length === 0 && failed.length === 0 && missing.length === 0 ? (
            <AppText color={colors.textSecondary}>Δεν υπάρχουν διαθέσιμα κριτήρια. Δες την επίσημη πηγή.</AppText>
          ) : null}
          {passed.map((o) => (
            <View key={o.rule.id} style={styles.reason}>
              <CircleCheck size={20} color={colors.success} />
              <AppText style={styles.flex}>{o.rule.description}</AppText>
            </View>
          ))}
          {failed.map((o) => (
            <View key={o.rule.id} style={styles.reason}>
              <CircleAlert size={20} color={colors.danger} />
              <AppText style={styles.flex}>
                {o.rule.description} <AppText color={colors.textMuted}>— δεν ταιριάζει με το προφίλ σου</AppText>
              </AppText>
            </View>
          ))}
          {missing.map((o) => (
            <View key={o.rule.id} style={styles.reason}>
              <CircleHelp size={20} color={colors.warning} />
              <AppText style={styles.flex}>
                {o.rule.description} <AppText color={colors.textMuted}>— χρειαζόμαστε: {profileFieldLabels[o.rule.field].toLowerCase()}</AppText>
              </AppText>
            </View>
          ))}
        </View>
      </Card>

      {benefit.requiredChecks.length > 0 ? (
        <Card>
          <View style={styles.cardTitleRow}>
            <ListChecks size={20} color={colors.primary} />
            <AppText variant="cardTitle">Απαιτούμενοι έλεγχοι</AppText>
          </View>
          <AppText variant="caption" color={colors.textMuted} style={styles.mtXs}>
            Αυτά δεν μπορούμε να τα ελέγξουμε εμείς — επιβεβαίωσέ τα στην επίσημη πηγή.
          </AppText>
          <View style={styles.mtMd}>
            <BulletList items={benefit.requiredChecks} />
          </View>
        </Card>
      ) : null}

      {procedure ? (
        <View style={styles.listCard}>
          <ListRow
            icon={FileText}
            title="Πώς κάνω αίτηση;"
            subtitle={procedure.title}
            onPress={() => router.push({ pathname: '/procedures/[id]', params: { id: procedure.id, benefitId: benefit.id } })}
          />
        </View>
      ) : null}

      <OfficialSource source={benefit.source} contentId={benefit.id} contentType="benefit" />
      <Button
        label="Άνοιγμα επίσημης σελίδας"
        icon={ExternalLink}
        variant="secondary"
        onPress={() => openOfficialUrl(benefit.officialUrl, { contentId: benefit.id, contentType: 'benefit' })}
      />
      <AppText variant="caption" color={colors.textMuted}>
        Τελευταία επιβεβαίωση: {formatFullDate(benefit.lastVerified)}
      </AppText>
      <Disclaimer text={ELIGIBILITY_DISCLAIMER} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: spacing.md },
  icon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  flex: { flex: 1 },
  gapSm: { gap: spacing.md, marginTop: spacing.md },
  reason: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mtXs: { marginTop: spacing.xs },
  mtMd: { marginTop: spacing.md },
  listCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
});
