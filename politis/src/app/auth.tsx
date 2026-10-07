import { router, useLocalSearchParams } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, Screen, StackHeader, TextField } from '@/components/ui';
import { showMessage } from '@/lib/dialog';
import { authService } from '@/services/authService';
import { useProfileStore } from '@/store/profileStore';
import { colors, spacing, touchTarget } from '@/theme';

type Mode = 'signup' | 'signin';

function continueAfterAuth() {
  const profile = useProfileStore.getState().profile;
  router.replace(profile?.onboardingCompleted ? '/(tabs)' : '/onboarding');
}

export default function Auth() {
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'signin' ? 'signin' : 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const available = authService.isAvailable;

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  const validPassword = password.length >= 8;

  const submit = async () => {
    if (!validEmail) return setError('Έλεγξε ότι το email είναι σωστό.');
    if (!validPassword) return setError('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.');
    setError(null);
    setLoading(true);
    const result = mode === 'signup' ? await authService.signUp(email, password) : await authService.signIn(email, password);
    setLoading(false);
    if (!result.ok) return setError(result.message);
    if (result.needsEmailConfirmation) {
      showMessage('Επιβεβαίωσε το email σου', 'Σου στείλαμε ένα email. Πάτησε τον σύνδεσμο και μετά συνδέσου.');
      setMode('signin');
      return;
    }
    continueAfterAuth();
  };

  const startDemo = () => {
    authService.startDemo();
    continueAfterAuth();
  };

  const comingSoon = (provider: string) =>
    showMessage('Σύντομα διαθέσιμο', `Η σύνδεση με ${provider} θα είναι διαθέσιμη σύντομα. Μέχρι τότε, χρησιμοποίησε email.`);

  return (
    <Screen header={<StackHeader />} edges={['top', 'bottom']}>
      <View style={styles.head}>
        <AppText variant="screenTitle">{mode === 'signup' ? 'Δημιούργησε λογαριασμό' : 'Καλώς ήρθες ξανά'}</AppText>
        <AppText variant="subtitle" color={colors.textSecondary}>
          {mode === 'signup'
            ? 'Για να αποθηκεύονται οι εργασίες και οι προτιμήσεις σου με ασφάλεια.'
            : 'Συνδέσου για να συνεχίσεις από εκεί που έμεινες.'}
        </AppText>
      </View>

      {!available ? (
        <Card tone="primary">
          <AppText variant="cardTitle">Δοκιμαστική λειτουργία</AppText>
          <AppText color={colors.textSecondary} style={styles.mt}>
            Οι λογαριασμοί δεν είναι ακόμη ενεργοί σε αυτή την έκδοση. Μπορείς να συνεχίσεις χωρίς λογαριασμό — τα στοιχεία σου μένουν μόνο σε αυτή τη συσκευή.
          </AppText>
          <Button label="Συνέχεια χωρίς λογαριασμό" onPress={startDemo} style={styles.mtLg} />
        </Card>
      ) : null}

      <View style={[styles.form, !available && styles.disabled]} pointerEvents={available ? 'auto' : 'none'}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="name@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          editable={available}
        />
        <TextField
          label="Κωδικός"
          value={password}
          onChangeText={setPassword}
          placeholder="Τουλάχιστον 8 χαρακτήρες"
          secureTextEntry
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          textContentType={mode === 'signup' ? 'newPassword' : 'password'}
          editable={available}
          error={error ?? undefined}
          onSubmitEditing={submit}
        />
        <Button label={mode === 'signup' ? 'Δημιουργία λογαριασμού' : 'Σύνδεση'} icon={Mail} onPress={submit} loading={loading} disabled={!available} />
      </View>

      <View style={styles.divider}>
        <View style={styles.line} />
        <AppText variant="caption" color={colors.textMuted}>
          ή
        </AppText>
        <View style={styles.line} />
      </View>

      <View style={styles.form}>
        <Button label="Συνέχεια με Google" variant="secondary" onPress={() => comingSoon('Google')} />
        <Button label="Συνέχεια με Apple" variant="secondary" onPress={() => comingSoon('Apple')} />
        {available ? <Button label="Δοκίμασε χωρίς λογαριασμό" variant="ghost" onPress={startDemo} /> : null}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setError(null);
          setMode(mode === 'signup' ? 'signin' : 'signup');
        }}
        style={styles.switch}
      >
        <AppText color={colors.textSecondary} align="center">
          {mode === 'signup' ? 'Έχεις ήδη λογαριασμό; ' : 'Δεν έχεις λογαριασμό; '}
          <AppText variant="bodyStrong" color={colors.primary}>
            {mode === 'signup' ? 'Σύνδεση' : 'Εγγραφή'}
          </AppText>
        </AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: spacing.sm },
  form: { gap: spacing.md },
  disabled: { opacity: 0.45 },
  mt: { marginTop: spacing.xs },
  mtLg: { marginTop: spacing.lg },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  switch: { minHeight: touchTarget, justifyContent: 'center' },
});
