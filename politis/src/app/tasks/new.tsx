import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Chip, Screen, StackHeader, TextField } from '@/components/ui';
import { daysFromNow, formatWeekdayDate } from '@/lib/dates';
import { taskService } from '@/services/taskService';
import { colors, spacing } from '@/theme';

const DUE_OPTIONS: { label: string; days: number | null }[] = [
  { label: 'Χωρίς προθεσμία', days: null },
  { label: 'Αύριο', days: 1 },
  { label: 'Σε 3 ημέρες', days: 3 },
  { label: 'Σε 1 εβδομάδα', days: 7 },
  { label: 'Σε 2 εβδομάδες', days: 14 },
  { label: 'Σε 1 μήνα', days: 30 },
];

export default function NewTask() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [days, setDays] = useState<number | null>(7);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return setError('Γράψε έναν τίτλο για την εργασία.');
    setSaving(true);
    await taskService.create({ title, description, dueDate: days === null ? undefined : daysFromNow(days, 12) });
    setSaving(false);
    router.back();
  };

  return (
    <Screen header={<StackHeader title="Νέα εργασία" />} edges={['top', 'bottom']} footer={<Button label="Αποθήκευση" onPress={save} loading={saving} />}>
      <AppText variant="screenTitle">Τι θέλεις να θυμάσαι;</AppText>
      <TextField
        label="Τίτλος"
        value={title}
        onChangeText={(t) => {
          setTitle(t);
          if (error) setError(undefined);
        }}
        placeholder="Π.χ. Ανανέωση διαβατηρίου"
        error={error}
        maxLength={200}
        autoFocus
      />
      <TextField label="Σημειώσεις (προαιρετικό)" value={description} onChangeText={setDescription} placeholder="Ό,τι θέλεις να θυμάσαι" multiline style={styles.multiline} />
      <View style={styles.section}>
        <AppText variant="label" color={colors.textSecondary}>
          Προθεσμία
        </AppText>
        <View style={styles.chips}>
          {DUE_OPTIONS.map((o) => (
            <Chip key={o.label} label={o.label} selected={days === o.days} onPress={() => setDays(o.days)} />
          ))}
        </View>
        {days !== null ? (
          <AppText variant="caption" color={colors.textMuted}>
            {formatWeekdayDate(daysFromNow(days, 12))} · Θα σου στείλουμε υπενθύμιση την προηγούμενη μέρα.
          </AppText>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  multiline: { minHeight: 96, paddingTop: spacing.md, textAlignVertical: 'top' },
});
