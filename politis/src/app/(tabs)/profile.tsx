import { router } from 'expo-router';
import {
  Bell,
  Bookmark,
  ChartBar,
  Download,
  Globe,
  Home as HomeIcon,
  LogOut,
  MapPin,
  Moon,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Users,
  Briefcase,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { Disclaimer, NOT_GOVERNMENT_NOTICE } from '@/components/Disclaimer';
import { AppText, Card, ListRow, Screen } from '@/components/ui';
import { APP_INITIAL, APP_NAME, PLUS_NAME } from '@/lib/brand';
import { usePremium } from '@/store/premiumStore';
import { showMessage } from '@/lib/dialog';
import { regionLabels } from '@/lib/labels';
import { cancelAllReminders, ensureNotificationPermission, remindersAvailable } from '@/lib/notifications';
import { displayValue } from '@/lib/profileQuestions';
import { confirmDeleteAccount, confirmSignOut } from '@/services/accountActions';
import { useAppStore } from '@/store/appStore';
import { useProfileStore } from '@/store/profileStore';
import type { ProfileField } from '@/types/models';
import { colors, radius, spacing } from '@/theme';

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <AppText variant="sectionTitle">{title}</AppText>
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

const Sep = () => <View style={styles.sep} />;

export default function Profile() {
  const profile = useProfileStore((s) => s.profile);
  const session = useAppStore((s) => s.session);
  const prefs = useAppStore((s) => s.preferences);
  const setPreference = useAppStore((s) => s.setPreference);
  const savedCount = useAppStore((s) => s.savedBenefitIds.length);
  const { isPlus, source: premiumSource } = usePremium();

  const value = (field: ProfileField) => displayValue(profile, field) ?? 'Δεν έχει συμπληρωθεί';
  const edit = (field: ProfileField | 'firstName') => router.push({ pathname: '/profile-edit', params: { field } });

  const toggleNotifications = async (enabled: boolean) => {
    if (enabled && !remindersAvailable) {
      showMessage('Ειδοποιήσεις', 'Οι υπενθυμίσεις στη συσκευή δεν είναι διαθέσιμες σε αυτή την έκδοση της εφαρμογής. Θα βλέπεις τις προθεσμίες σου στις «Ειδοποιήσεις» μέσα στην εφαρμογή.');
    } else if (enabled) {
      const granted = await ensureNotificationPermission();
      if (!granted) showMessage('Ειδοποιήσεις', 'Για να λαμβάνεις υπενθυμίσεις, ενεργοποίησε τις ειδοποιήσεις από τις ρυθμίσεις της συσκευής σου.');
    } else {
      await cancelAllReminders();
    }
    setPreference('notificationsEnabled', enabled);
  };

  const signOut = () => confirmSignOut(session?.mode === 'demo');

  const initial = (profile?.firstName?.[0] ?? APP_INITIAL).toUpperCase();
  const place = profile?.region ? `${profile.municipality ? `${profile.municipality}, ` : ''}${regionLabels[profile.region]}` : 'Δεν έχει συμπληρωθεί';

  return (
    <Screen>
      <AppText variant="screenTitle">Προφίλ</AppText>

      <Card>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <AppText variant="sectionTitle" color={colors.onPrimary}>
              {initial}
            </AppText>
          </View>
          <View style={styles.flex}>
            <AppText variant="cardTitle">{profile?.firstName || 'Χωρίς όνομα'}</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {session?.mode === 'account' ? session.email ?? 'Λογαριασμός' : 'Δοκιμαστική λειτουργία · δεδομένα μόνο στη συσκευή'}
            </AppText>
          </View>
        </View>
      </Card>

      <View style={styles.groupCard}>
        <ListRow
          icon={Sparkles}
          iconColor={colors.accent}
          title={PLUS_NAME}
          subtitle={isPlus ? (premiumSource === 'demo' ? 'Ενεργό (δοκιμαστικά)' : 'Ενεργό') : 'Απεριόριστος βοηθός και περισσότερα'}
          onPress={() => router.push('/plus')}
        />
      </View>

      <Group title="Τα στοιχεία μου">
        <ListRow icon={User} title="Όνομα" subtitle={profile?.firstName || 'Δεν έχει συμπληρωθεί'} onPress={() => edit('firstName')} />
        <Sep />
        <ListRow icon={User} title="Ηλικία" subtitle={value('ageRange')} onPress={() => edit('ageRange')} />
        <Sep />
        <ListRow icon={MapPin} title="Περιοχή" subtitle={place} onPress={() => edit('region')} />
        <Sep />
        <ListRow icon={Briefcase} title="Εργασία" subtitle={value('employmentStatus')} onPress={() => edit('employmentStatus')} />
        <Sep />
        <ListRow icon={Users} title="Οικογένεια" subtitle={value('children')} onPress={() => edit('children')} />
        <Sep />
        <ListRow icon={HomeIcon} title="Κατοικία" subtitle={value('housingStatus')} onPress={() => edit('housingStatus')} />
        <Sep />
        <ListRow icon={Bookmark} title="Αποθηκευμένες παροχές" subtitle={savedCount === 0 ? 'Καμία ακόμη' : `${savedCount}`} onPress={() => router.push({ pathname: '/benefits', params: { saved: '1' } })} />
      </Group>

      <Group title="Προτιμήσεις">
        <ListRow
          icon={Bell}
          title="Ειδοποιήσεις"
          subtitle="Υπενθυμίσεις για προθεσμίες"
          right={<Switch value={prefs.notificationsEnabled} onValueChange={toggleNotifications} accessibilityLabel="Ειδοποιήσεις" trackColor={{ true: colors.primary }} />}
        />
        <Sep />
        <ListRow
          icon={ChartBar}
          title="Ανώνυμα στατιστικά χρήσης"
          subtitle="Χωρίς προσωπικά δεδομένα. Μας βοηθούν να βελτιώνουμε την εφαρμογή."
          right={<Switch value={prefs.analyticsEnabled} onValueChange={(v) => setPreference('analyticsEnabled', v)} accessibilityLabel="Ανώνυμα στατιστικά χρήσης" trackColor={{ true: colors.primary }} />}
        />
        <Sep />
        <ListRow icon={Moon} title="Εμφάνιση" subtitle="Ανοιχτό θέμα" onPress={() => showMessage('Εμφάνιση', 'Το σκούρο θέμα έρχεται σύντομα.')} />
        <Sep />
        <ListRow icon={Globe} title="Γλώσσα" subtitle="Ελληνικά" onPress={() => showMessage('Γλώσσα', 'Προς το παρόν η εφαρμογή είναι διαθέσιμη μόνο στα ελληνικά.')} />
      </Group>

      <Group title="Απόρρητο">
        <ListRow icon={ShieldCheck} title="Κέντρο απορρήτου" subtitle="Τι αποθηκεύουμε και γιατί" onPress={() => router.push('/privacy')} />
        <Sep />
        <ListRow icon={Download} title="Τα δεδομένα μου" subtitle="Προβολή και εξαγωγή" onPress={() => router.push('/privacy')} />
        <Sep />
        <ListRow icon={Trash2} title="Διαγραφή λογαριασμού" destructive onPress={confirmDeleteAccount} />
      </Group>

      <View style={styles.groupCard}>
        <ListRow icon={LogOut} title="Αποσύνδεση" onPress={signOut} showChevron={false} />
      </View>

      <Disclaimer text={NOT_GOVERNMENT_NOTICE} />
      <AppText variant="caption" color={colors.textMuted} align="center">
        {APP_NAME} · Έκδοση 1.0.0 (MVP)
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: { width: 56, height: 56, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  group: { gap: spacing.md },
  groupCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  sep: { height: 1, backgroundColor: colors.border, marginLeft: 64 },
});
