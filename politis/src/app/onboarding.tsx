import { router } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, OptionCard, ProgressBar, Screen, StackHeader, TextField } from '@/components/ui';
import { analytics } from '@/lib/analytics';
import { profileFieldPurposes } from '@/lib/labels';
import { profileQuestions } from '@/lib/profileQuestions';
import { profileService } from '@/services/profileService';
import { useProfileStore } from '@/store/profileStore';
import type { ProfileField, UserProfile } from '@/types/models';
import { colors, spacing } from '@/theme';

type Step = 'intro' | Exclude<ProfileField, 'incomeRange'>;
const STEPS: Step[] = ['intro', 'ageRange', 'employmentStatus', 'children', 'housingStatus', 'region'];

type Draft = Partial<Pick<UserProfile, 'firstName' | 'ageRange' | 'employmentStatus' | 'children' | 'housingStatus' | 'region' | 'municipality'>>;

export default function Onboarding() {
  const existing = useProfileStore((s) => s.profile);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => ({
    firstName: existing?.firstName,
    ageRange: existing?.ageRange,
    employmentStatus: existing?.employmentStatus,
    children: existing?.children,
    housingStatus: existing?.housingStatus,
    region: existing?.region,
    municipality: existing?.municipality,
  }));
  const [saving, setSaving] = useState(false);

  const step = STEPS[index] ?? 'intro';
  const isLast = index === STEPS.length - 1;
  const answered = step === 'intro' || draft[step] !== undefined;

  const finish = async () => {
    setSaving(true);
    await profileService.save({ ...draft, firstName: draft.firstName?.trim() || undefined, onboardingCompleted: true });
    analytics.track('profile_completed');
    setSaving(false);
    router.replace('/(tabs)');
  };

  const next = () => (isLast ? finish() : setIndex((i) => i + 1));
  const back = () => (index === 0 ? router.back() : setIndex((i) => i - 1));
  const skip = () => {
    if (step !== 'intro') setDraft((d) => ({ ...d, [step]: undefined }));
    next();
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      header={
        <View>
          <StackHeader onBack={back} showBack={index > 0 || router.canGoBack()} title={`Βήμα ${index + 1} από ${STEPS.length}`} />
          <View style={styles.progress}>
            <ProgressBar value={(index + 1) / STEPS.length} label={`Βήμα ${index + 1} από ${STEPS.length}`} />
          </View>
        </View>
      }
      footer={
        <>
          <Button label={isLast ? 'Ολοκλήρωση' : 'Συνέχεια'} onPress={next} disabled={!answered} loading={saving} />
          {step !== 'intro' ? <Button label="Προτιμώ να μην απαντήσω" variant="ghost" onPress={skip} /> : null}
        </>
      }
    >
      {step === 'intro' ? (
        <View style={styles.gap}>
          <AppText variant="screenTitle">Ας γνωριστούμε 👋</AppText>
          <AppText variant="subtitle" color={colors.textSecondary}>
            Με λίγες απαντήσεις μπορούμε να σου δείξουμε τι μπορεί να σε αφορά. Χρειάζεται περίπου ένα λεπτό.
          </AppText>
          <TextField
            label="Πώς να σε λέμε; (προαιρετικό)"
            value={draft.firstName ?? ''}
            onChangeText={(firstName) => setDraft((d) => ({ ...d, firstName }))}
            placeholder="Το μικρό σου όνομα"
            autoCapitalize="words"
            autoComplete="given-name"
            hint={profileFieldPurposes.firstName}
            returnKeyType="next"
            onSubmitEditing={next}
          />
          <View style={styles.trust}>
            <ShieldCheck size={20} color={colors.success} />
            <AppText variant="caption" color={colors.textSecondary} style={styles.flex}>
              Δεν θα σου ζητήσουμε ποτέ κωδικούς Taxisnet, τραπεζικά στοιχεία, ΑΦΜ ή ΑΜΚΑ. Μπορείς να αλλάξεις ή να διαγράψεις τα στοιχεία σου όποτε θέλεις.
            </AppText>
          </View>
        </View>
      ) : (
        <View style={styles.gap}>
          <AppText variant="screenTitle">{profileQuestions[step].title}</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            Γιατί το ρωτάμε; {profileFieldPurposes[step]}
          </AppText>
          <View style={styles.options} accessibilityRole="radiogroup">
            {profileQuestions[step].options.map((o) => (
              <OptionCard
                key={String(o.value)}
                label={o.label}
                emoji={o.emoji}
                selected={draft[step] === o.value}
                onPress={() => setDraft((d) => ({ ...d, [step]: o.value }))}
              />
            ))}
          </View>
          {step === 'region' ? (
            <TextField
              label="Δήμος (προαιρετικό)"
              value={draft.municipality ?? ''}
              onChangeText={(municipality) => setDraft((d) => ({ ...d, municipality }))}
              placeholder="Π.χ. Δήμος Αθηναίων"
            />
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  gap: { gap: spacing.lg },
  options: { gap: spacing.sm },
  trust: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  flex: { flex: 1 },
});
