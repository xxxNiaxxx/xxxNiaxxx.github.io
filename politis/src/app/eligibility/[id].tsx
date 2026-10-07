import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, CircleAlert, CircleCheck, CircleHelp } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { Disclaimer, ELIGIBILITY_DISCLAIMER } from '@/components/Disclaimer';
import { EligibilityBadge } from '@/components/EligibilityBadge';
import { OfficialSource } from '@/components/OfficialSource';
import { AppText, Button, Card, EmptyState, ErrorState, OptionCard, ProgressBar, Screen, SkeletonList, StackHeader } from '@/components/ui';
import { useBenefit } from '@/hooks/useContent';
import { analytics } from '@/lib/analytics';
import { evaluateBenefit, questionFieldsFor } from '@/lib/eligibility';
import { eligibilityPresentation, profileFieldPurposes } from '@/lib/labels';
import { profileQuestions } from '@/lib/profileQuestions';
import { profileService } from '@/services/profileService';
import { useProfileStore } from '@/store/profileStore';
import type { ProfileField, UserProfile } from '@/types/models';
import { colors, radius, spacing, toneColors } from '@/theme';

type AnswerValue = string | number | null; // null = «Δεν ξέρω»
type Answers = Partial<Record<ProfileField, AnswerValue>>;
type Phase = { kind: 'intro' } | { kind: 'question'; index: number } | { kind: 'result' };

export default function Eligibility() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: benefit, isLoading, isError, refetch } = useBenefit(id);
  const profile = useProfileStore((s) => s.profile);
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });
  const [answers, setAnswers] = useState<Answers>({});
  const [saveToProfile, setSaveToProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const completedTracked = useRef(false);

  const fields = useMemo(() => (benefit ? questionFieldsFor(benefit) : []), [benefit]);

  // Prefill answers from the profile once.
  useEffect(() => {
    if (!benefit) return;
    const prefill: Answers = {};
    fields.forEach((f) => {
      const v = profile?.[f];
      if (v !== undefined) prefill[f] = v;
    });
    setAnswers(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [benefit?.id]);

  const merged = useMemo<Partial<UserProfile>>(() => {
    const next: Partial<UserProfile> = { ...(profile ?? {}) };
    (Object.keys(answers) as ProfileField[]).forEach((f) => {
      const v = answers[f];
      (next as Record<string, unknown>)[f] = v === null ? undefined : v;
    });
    return next;
  }, [profile, answers]);

  const result = useMemo(() => (benefit ? evaluateBenefit(benefit, merged) : null), [benefit, merged]);

  useEffect(() => {
    if (phase.kind === 'result' && result && !completedTracked.current) {
      completedTracked.current = true;
      analytics.track('eligibility_completed', { contentId: result.benefitId, contentType: 'benefit', result: result.status });
    }
  }, [phase, result]);

  if (isLoading) {
    return (
      <Screen header={<StackHeader />}>
        <SkeletonList count={2} />
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

  const start = () => {
    analytics.track('eligibility_started', { contentId: benefit.id, contentType: 'benefit' });
    setPhase(fields.length > 0 ? { kind: 'question', index: 0 } : { kind: 'result' });
  };

  const persistAnswers = async () => {
    if (!saveToProfile) return;
    const patch: Partial<UserProfile> = {};
    (Object.keys(answers) as ProfileField[]).forEach((f) => {
      const v = answers[f];
      if (v !== null && v !== undefined) (patch as Record<string, unknown>)[f] = v;
    });
    if (Object.keys(patch).length > 0) await profileService.save(patch);
  };

  const goToProcedure = async () => {
    setSaving(true);
    await persistAnswers();
    setSaving(false);
    if (benefit.procedureId) router.push({ pathname: '/procedures/[id]', params: { id: benefit.procedureId, benefitId: benefit.id } });
  };

  const backToBenefit = async () => {
    await persistAnswers();
    router.back();
  };

  // ---- Intro ----
  if (phase.kind === 'intro') {
    return (
      <Screen header={<StackHeader />} edges={['top', 'bottom']} footer={<Button label="Ξεκίνα τον έλεγχο" icon={ArrowRight} iconPosition="right" onPress={start} />}>
        <AppText style={styles.bigEmoji}>📝</AppText>
        <AppText variant="screenTitle">Ας κάνουμε έναν γρήγορο έλεγχο</AppText>
        <AppText variant="subtitle" color={colors.textSecondary}>
          Θα χρειαστούμε μερικές πληροφορίες.
        </AppText>
        <Card tone="muted">
          <AppText variant="bodyStrong">{benefit.title}</AppText>
          <AppText variant="caption" color={colors.textMuted} style={styles.mtXs}>
            {fields.length === 0 ? 'Δεν χρειάζονται ερωτήσεις.' : `${fields.length} ${fields.length === 1 ? 'ερώτηση' : 'ερωτήσεις'} · λιγότερο από ένα λεπτό`}
          </AppText>
        </Card>
        <AppText variant="caption" color={colors.textMuted}>
          Όσα ήδη γνωρίζουμε από το προφίλ σου είναι προεπιλεγμένα. Δεν ζητάμε ποτέ ακριβή ποσά, ΑΦΜ ή κωδικούς.
        </AppText>
        <Disclaimer />
      </Screen>
    );
  }

  // ---- Question ----
  if (phase.kind === 'question') {
    const field = fields[phase.index] as ProfileField;
    const q = profileQuestions[field];
    const value = answers[field];
    const isLast = phase.index === fields.length - 1;
    const next = () => setPhase(isLast ? { kind: 'result' } : { kind: 'question', index: phase.index + 1 });
    const back = () => setPhase(phase.index === 0 ? { kind: 'intro' } : { kind: 'question', index: phase.index - 1 });
    return (
      <Screen
        edges={['top', 'bottom']}
        header={
          <View>
            <StackHeader onBack={back} title={`Ερώτηση ${phase.index + 1} από ${fields.length}`} />
            <View style={styles.progress}>
              <ProgressBar value={(phase.index + 1) / fields.length} label={`Ερώτηση ${phase.index + 1} από ${fields.length}`} />
            </View>
          </View>
        }
        footer={<Button label={isLast ? 'Δες το αποτέλεσμα' : 'Επόμενο'} onPress={next} disabled={value === undefined} />}
      >
        <AppText variant="screenTitle">{q.checkTitle}</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {profileFieldPurposes[field]}
        </AppText>
        <View style={styles.options} accessibilityRole="radiogroup">
          {q.options.map((o) => (
            <OptionCard key={String(o.value)} label={o.label} emoji={o.emoji} selected={value === o.value} onPress={() => setAnswers((a) => ({ ...a, [field]: o.value }))} />
          ))}
          <OptionCard label="Δεν ξέρω / Προτιμώ να μην απαντήσω" selected={value === null} onPress={() => setAnswers((a) => ({ ...a, [field]: null }))} />
        </View>
      </Screen>
    );
  }

  // ---- Result ----
  const p = eligibilityPresentation[result.status];
  const tone = toneColors[p.tone];
  return (
    <Screen
      edges={['top', 'bottom']}
      header={<StackHeader onBack={() => setPhase(fields.length ? { kind: 'question', index: fields.length - 1 } : { kind: 'intro' })} />}
      footer={
        <>
          {benefit.procedureId ? <Button label="Δες πώς κάνω αίτηση" icon={ArrowRight} iconPosition="right" onPress={goToProcedure} loading={saving} /> : null}
          <Button label="Πίσω στην παροχή" variant="ghost" onPress={backToBenefit} />
        </>
      }
    >
      <AppText variant="screenTitle">Ο έλεγχος ολοκληρώθηκε</AppText>
      <View style={[styles.resultBox, { backgroundColor: tone.bg }]} accessibilityRole="summary">
        <AppText variant="sectionTitle" color={tone.fg}>
          {p.symbol} {p.resultMessage}
        </AppText>
        <EligibilityBadge status={result.status} />
      </View>

      <Card>
        <AppText variant="cardTitle">Τα κριτήρια</AppText>
        <View style={styles.criteria}>
          {result.outcomes.map((o) => {
            const Icon = o.outcome === 'pass' ? CircleCheck : o.outcome === 'fail' ? CircleAlert : CircleHelp;
            const color = o.outcome === 'pass' ? colors.success : o.outcome === 'fail' ? colors.danger : colors.warning;
            const suffix = o.outcome === 'pass' ? 'Ναι' : o.outcome === 'fail' ? 'Όχι' : 'Άγνωστο';
            return (
              <View key={o.rule.id} style={styles.criterion} accessible accessibilityLabel={`${o.rule.description}: ${suffix}`}>
                <Icon size={20} color={color} />
                <AppText style={styles.flex}>{o.rule.description}</AppText>
                <AppText variant="captionStrong" color={color}>
                  {suffix}
                </AppText>
              </View>
            );
          })}
        </View>
      </Card>

      <Disclaimer text={ELIGIBILITY_DISCLAIMER} />

      <Card tone="muted">
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <AppText variant="bodyStrong">Αποθήκευση απαντήσεων στο προφίλ</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              Για να μη σε ρωτάμε ξανά. Μπορείς να τις αλλάξεις όποτε θέλεις.
            </AppText>
          </View>
          <Switch value={saveToProfile} onValueChange={setSaveToProfile} accessibilityLabel="Αποθήκευση απαντήσεων στο προφίλ" trackColor={{ true: colors.primary }} />
        </View>
      </Card>

      <OfficialSource source={benefit.source} contentId={benefit.id} contentType="benefit" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  bigEmoji: { fontSize: 44, lineHeight: 54 },
  mtXs: { marginTop: spacing.xs },
  progress: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  options: { gap: spacing.sm },
  resultBox: { padding: spacing.xl, borderRadius: radius.lg, gap: spacing.md },
  criteria: { gap: spacing.md, marginTop: spacing.md },
  criterion: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  flex: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
