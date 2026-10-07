import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, OptionCard, Screen, StackHeader, TextField } from '@/components/ui';
import { profileFieldPurposes } from '@/lib/labels';
import { profileQuestions } from '@/lib/profileQuestions';
import { profileService } from '@/services/profileService';
import { useProfileStore } from '@/store/profileStore';
import type { ProfileField } from '@/types/models';
import { colors, spacing } from '@/theme';

const EDITABLE: (ProfileField | 'firstName')[] = ['firstName', 'ageRange', 'employmentStatus', 'children', 'housingStatus', 'region', 'incomeRange'];

export default function ProfileEdit() {
  const params = useLocalSearchParams<{ field?: string }>();
  const field = (EDITABLE as string[]).includes(params.field ?? '') ? (params.field as ProfileField | 'firstName') : 'firstName';
  const profile = useProfileStore((s) => s.profile);
  const [value, setValue] = useState<string | number | undefined>(profile?.[field]);
  const [municipality, setMunicipality] = useState(profile?.municipality ?? '');
  const [saving, setSaving] = useState(false);

  const save = async (next: string | number | undefined) => {
    setSaving(true);
    const patch: Record<string, unknown> = { [field]: field === 'firstName' && typeof next === 'string' ? next.trim() || undefined : next };
    if (field === 'region') patch.municipality = next === undefined ? undefined : municipality.trim() || undefined;
    await profileService.save(patch);
    setSaving(false);
    router.back();
  };

  const question = field === 'firstName' ? null : profileQuestions[field];

  return (
    <Screen
      header={<StackHeader title="Επεξεργασία" />}
      edges={['top', 'bottom']}
      footer={
        <>
          <Button label="Αποθήκευση" onPress={() => save(value)} loading={saving} />
          <Button label="Διαγραφή αυτού του στοιχείου" variant="ghost" onPress={() => save(undefined)} />
        </>
      }
    >
      <AppText variant="screenTitle">{question ? question.title : 'Πώς να σε λέμε;'}</AppText>
      <AppText variant="caption" color={colors.textMuted}>
        {profileFieldPurposes[field]}
      </AppText>
      {question ? (
        <View style={styles.options} accessibilityRole="radiogroup">
          {question.options.map((o) => (
            <OptionCard key={String(o.value)} label={o.label} emoji={o.emoji} selected={value === o.value} onPress={() => setValue(o.value)} />
          ))}
        </View>
      ) : (
        <TextField label="Όνομα" value={typeof value === 'string' ? value : ''} onChangeText={setValue} placeholder="Το μικρό σου όνομα" autoFocus />
      )}
      {field === 'region' ? <TextField label="Δήμος (προαιρετικό)" value={municipality} onChangeText={setMunicipality} placeholder="Π.χ. Δήμος Αθηναίων" /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  options: { gap: spacing.sm },
});
