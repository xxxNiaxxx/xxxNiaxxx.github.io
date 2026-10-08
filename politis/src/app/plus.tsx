import { router } from 'expo-router';
import { Check, Gift, Sparkles } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Button, Card, Screen, StackHeader } from '@/components/ui';
import { analytics } from '@/lib/analytics';
import { PLUS_NAME } from '@/lib/brand';
import { confirmDialog, showMessage } from '@/lib/dialog';
import { ALWAYS_FREE, PLUS_FEATURES, PURCHASES_ENABLED } from '@/lib/premium';
import { usePremium, usePremiumStore } from '@/store/premiumStore';
import { colors, radius, spacing } from '@/theme';

export default function Plus() {
  const { isPlus, source } = usePremium();
  const setPlan = usePremiumStore((s) => s.setPlan);

  useEffect(() => {
    analytics.track('paywall_viewed');
  }, []);

  const activateDemo = async () => {
    const ok = await confirmDialog(
      'Δοκιμαστική ενεργοποίηση',
      `Οι αγορές δεν είναι ακόμη ενεργές. Θα ενεργοποιηθεί το ${PLUS_NAME} δοκιμαστικά σε αυτή τη συσκευή, χωρίς χρέωση.`,
      'Ενεργοποίηση',
    );
    if (!ok) return;
    setPlan('plus', 'demo');
    analytics.track('plus_activated', { mode: 'demo' });
    router.back();
  };

  const deactivate = () => setPlan('free', 'none');

  return (
    <Screen
      header={<StackHeader title={PLUS_NAME} />}
      edges={['top', 'bottom']}
      footer={
        isPlus ? (
          <>
            <Button label="Τέλεια, συνέχεια" onPress={() => router.back()} />
            {source === 'demo' ? <Button label="Απενεργοποίηση δοκιμής" variant="ghost" onPress={deactivate} /> : null}
          </>
        ) : PURCHASES_ENABLED ? (
          <Button label="Συνέχεια στην αγορά" onPress={() => showMessage('Σύντομα', 'Οι αγορές θα ενεργοποιηθούν σύντομα.')} />
        ) : (
          <>
            <Button label="Δοκιμαστική ενεργοποίηση" icon={Sparkles} onPress={activateDemo} />
            <AppText variant="caption" color={colors.textMuted} align="center">
              Οι αγορές δεν είναι ακόμη διαθέσιμες. Δεν γίνεται καμία χρέωση.
            </AppText>
          </>
        )
      }
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Sparkles size={28} color={colors.accent} />
        </View>
        <AppText variant="screenTitle">{PLUS_NAME}</AppText>
        <AppText variant="subtitle" color={colors.textSecondary}>
          Για όσους θέλουν να τα έχουν όλα τακτοποιημένα, χωρίς να το σκέφτονται.
        </AppText>
        {isPlus ? <Badge label={source === 'demo' ? 'Ενεργό (δοκιμαστικά)' : 'Ενεργό'} tone="success" icon={Check} /> : null}
      </View>

      <View style={styles.list}>
        {PLUS_FEATURES.map((f) => (
          <View key={f.id} style={styles.feature}>
            <View style={styles.check}>
              <Check size={16} color={colors.onPrimary} strokeWidth={3} />
            </View>
            <View style={styles.flex}>
              <View style={styles.titleRow}>
                <AppText variant="bodyStrong">{f.title}</AppText>
                {!f.available ? <Badge label="Σύντομα" tone="neutral" /> : null}
              </View>
              <AppText color={colors.textSecondary}>{f.description}</AppText>
            </View>
          </View>
        ))}
      </View>

      <Card tone="muted">
        <View style={styles.titleRow}>
          <Gift size={20} color={colors.success} />
          <AppText variant="cardTitle">Πάντα δωρεάν, για όλους</AppText>
        </View>
        <View style={styles.freeList}>
          {ALWAYS_FREE.map((item) => (
            <View key={item} style={styles.freeRow}>
              <Check size={16} color={colors.success} />
              <AppText style={styles.flex}>{item}</AppText>
            </View>
          ))}
        </View>
        <AppText variant="caption" color={colors.textMuted} style={styles.mtSm}>
          Η πληροφορία για τα δικαιώματά σου δεν κλειδώνεται ποτέ πίσω από συνδρομή.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.md },
  heroIcon: { width: 56, height: 56, borderRadius: radius.lg, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  list: { gap: spacing.lg },
  feature: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  check: { width: 26, height: 26, borderRadius: radius.pill, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  freeList: { gap: spacing.sm, marginTop: spacing.md },
  freeRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  mtSm: { marginTop: spacing.md },
});
