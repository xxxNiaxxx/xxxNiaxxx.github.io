import { router } from 'expo-router';
import { BellRing, CalendarDays, ListChecks, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Disclaimer, NOT_GOVERNMENT_NOTICE } from '@/components/Disclaimer';
import { AppText, Button, Screen } from '@/components/ui';
import { APP_INITIAL, APP_NAME_CAPS, APP_TAGLINE } from '@/lib/brand';
import { useAppStore } from '@/store/appStore';
import { colors, radius, shadows, spacing } from '@/theme';

const VALUE_PROPS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Sparkles, title: 'Τι αφορά εμένα;', text: 'Παροχές και προγράμματα που μπορεί να σε αφορούν, με βάση τα στοιχεία σου.' },
  { icon: ListChecks, title: 'Τι πρέπει να κάνω;', text: 'Απλά βήματα για κάθε διαδικασία, χωρίς γραφειοκρατική γλώσσα.' },
  { icon: CalendarDays, title: 'Πότε πρέπει να το κάνω;', text: 'Προθεσμίες και υπενθυμίσεις, σε ένα σημείο.' },
];

export default function Welcome() {
  const setHasSeenWelcome = useAppStore((s) => s.setHasSeenWelcome);
  const go = (mode: 'signup' | 'signin') => {
    setHasSeenWelcome(true);
    router.push({ pathname: '/auth', params: { mode } });
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <>
          <Button label="Ξεκίνα" onPress={() => go('signup')} />
          <Button label="Έχω ήδη λογαριασμό" variant="ghost" onPress={() => go('signin')} />
        </>
      }
    >
      <View style={styles.hero}>
        <View style={[styles.logo, shadows.floating]}>
          <AppText style={styles.logoText} color={colors.onPrimary}>
            {APP_INITIAL}
          </AppText>
        </View>
        <AppText variant="caption" color={colors.primary} style={styles.brand}>
          {APP_NAME_CAPS}
        </AppText>
        <AppText variant="screenTitle" align="center">
          {APP_TAGLINE}
        </AppText>
        <AppText variant="subtitle" color={colors.textSecondary} align="center">
          Ο προσωπικός σου ψηφιακός βοηθός για τις παροχές, τις διαδικασίες και τις προθεσμίες σου.
        </AppText>
      </View>

      <View style={styles.props}>
        {VALUE_PROPS.map(({ icon: Icon, title, text }) => (
          <View key={title} style={styles.prop}>
            <View style={styles.propIcon}>
              <Icon size={22} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <AppText variant="cardTitle">{title}</AppText>
              <AppText color={colors.textSecondary}>{text}</AppText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.trust}>
        <ShieldCheck size={18} color={colors.success} />
        <AppText variant="caption" color={colors.textSecondary} style={styles.flex}>
          Δεν σου ζητάμε ποτέ κωδικούς Taxisnet, τραπεζικά στοιχεία, ΑΦΜ ή ΑΜΚΑ.
        </AppText>
      </View>
      <View style={styles.trust}>
        <BellRing size={18} color={colors.primary} />
        <AppText variant="caption" color={colors.textSecondary} style={styles.flex}>
          Κάθε πληροφορία συνοδεύεται από την επίσημη πηγή της.
        </AppText>
      </View>
      <Disclaimer text={NOT_GOVERNMENT_NOTICE} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxl },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontSize: 36, lineHeight: 44, fontWeight: '700' },
  brand: { letterSpacing: 3, fontWeight: '700' },
  props: { gap: spacing.lg, marginTop: spacing.md },
  prop: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
  propIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  trust: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
});
