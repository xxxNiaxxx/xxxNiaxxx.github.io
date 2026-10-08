import { router } from 'expo-router';
import { Ban, Download, Pencil, ShieldCheck, Trash2 } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { BulletList } from '@/components/BulletList';
import { AppText, Button, Card, Screen, StackHeader } from '@/components/ui';
import { profileFieldLabels, profileFieldPurposes, regionLabels } from '@/lib/labels';
import { displayValue } from '@/lib/profileQuestions';
import { confirmDeleteAccount, exportDataPlaceholder } from '@/services/accountActions';
import { useAppStore } from '@/store/appStore';
import { useProfileStore } from '@/store/profileStore';
import { useTaskStore } from '@/store/taskStore';
import type { ProfileField } from '@/types/models';
import { colors, radius, spacing, touchTarget } from '@/theme';

const FIELDS: (ProfileField | 'firstName')[] = ['firstName', 'ageRange', 'employmentStatus', 'children', 'housingStatus', 'region', 'incomeRange'];

const NEVER_STORED = ['Κωδικοί Taxisnet ή άλλων δημόσιων υπηρεσιών', 'Τραπεζικά στοιχεία ή κωδικοί', 'ΑΦΜ και ΑΜΚΑ', 'Ακριβή ποσά εισοδήματος'];

export default function Privacy() {
  const profile = useProfileStore((s) => s.profile);
  const taskCount = useTaskStore((s) => s.tasks.length);
  const session = useAppStore((s) => s.session);
  const analyticsEnabled = useAppStore((s) => s.preferences.analyticsEnabled);

  const valueOf = (field: ProfileField | 'firstName') => {
    if (field === 'firstName') return profile?.firstName || null;
    if (field === 'region' && profile?.region) return `${profile.municipality ? `${profile.municipality}, ` : ''}${regionLabels[profile.region]}`;
    return displayValue(profile, field);
  };

  return (
    <Screen header={<StackHeader title="Κέντρο απορρήτου" />}>
      <View style={styles.head}>
        <View style={styles.shield}>
          <ShieldCheck size={26} color={colors.success} />
        </View>
        <AppText variant="screenTitle">Τα δεδομένα σου</AppText>
        <AppText variant="subtitle" color={colors.textSecondary}>
          Εσύ αποφασίζεις τι μοιράζεσαι και γιατί το χρησιμοποιούμε.
        </AppText>
      </View>

      <Card tone="muted">
        <AppText variant="bodyStrong">Πού αποθηκεύονται</AppText>
        <AppText color={colors.textSecondary} style={styles.mtXs}>
          {session?.mode === 'account'
            ? 'Στον λογαριασμό σου, με κρυπτογραφημένη σύνδεση. Μόνο εσύ έχεις πρόσβαση στα στοιχεία σου.'
            : 'Μόνο σε αυτή τη συσκευή. Δεν στέλνονται πουθενά.'}
        </AppText>
      </Card>

      <View style={styles.list}>
        {FIELDS.map((field) => {
          const value = valueOf(field);
          const label = field === 'firstName' ? 'Όνομα' : profileFieldLabels[field];
          return (
            <View key={field} style={styles.field}>
              <View style={styles.flex}>
                <AppText variant="caption" color={colors.textMuted}>
                  {label}
                </AppText>
                <AppText variant="bodyStrong" color={value ? colors.text : colors.textMuted}>
                  {value ?? 'Δεν έχει συμπληρωθεί'}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary} style={styles.mtXs}>
                  {profileFieldPurposes[field]}
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Επεξεργασία: ${label}`}
                onPress={() => router.push({ pathname: '/profile-edit', params: { field } })}
                style={({ pressed }) => [styles.edit, pressed && { backgroundColor: colors.primarySoft }]}
              >
                <Pencil size={16} color={colors.primary} />
                <AppText variant="label" color={colors.primary}>
                  Επεξεργασία
                </AppText>
              </Pressable>
            </View>
          );
        })}
      </View>

      <Card>
        <AppText variant="cardTitle">Άλλα δεδομένα</AppText>
        <AppText color={colors.textSecondary} style={styles.mtXs}>
          Εργασίες: {taskCount} · Ανώνυμα στατιστικά χρήσης: {analyticsEnabled ? 'ενεργά' : 'ανενεργά'}
        </AppText>
        <AppText variant="caption" color={colors.textMuted} style={styles.mtXs}>
          Τα στατιστικά δεν περιέχουν ποτέ στοιχεία του προφίλ σου. Μπορείς να τα απενεργοποιήσεις από το Προφίλ.
        </AppText>
      </Card>

      <Card>
        <View style={styles.titleRow}>
          <Ban size={20} color={colors.danger} />
          <AppText variant="cardTitle">Τι δεν ζητάμε και δεν αποθηκεύουμε ποτέ</AppText>
        </View>
        <View style={styles.mtMd}>
          <BulletList items={NEVER_STORED} />
        </View>
      </Card>

      <Button label="Εξαγωγή δεδομένων" icon={Download} variant="secondary" onPress={exportDataPlaceholder} />
      <Button label="Διαγραφή λογαριασμού" icon={Trash2} variant="danger" onPress={confirmDeleteAccount} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: spacing.sm },
  shield: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  mtXs: { marginTop: spacing.xs },
  mtMd: { marginTop: spacing.md },
  list: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  field: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'flex-start' },
  flex: { flex: 1 },
  edit: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: touchTarget, paddingHorizontal: spacing.sm, borderRadius: radius.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
