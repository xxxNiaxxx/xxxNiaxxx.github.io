import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useDialogStore } from '@/lib/dialog';
import { colors, radius, shadows, spacing } from '@/theme';
import { AppText, Button } from './ui';

/** Renders dialogs requested through lib/dialog on web. Native uses the system Alert instead. */
export function DialogHost() {
  const current = useDialogStore((s) => s.current);
  const set = useDialogStore((s) => s.set);
  if (Platform.OS !== 'web' || !current) return null;

  const close = (ok: boolean) => {
    set(null);
    current.resolve?.(ok);
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => close(false)}>
      <Pressable style={styles.backdrop} onPress={() => close(false)} accessibilityLabel="Κλείσιμο">
        <Pressable style={[styles.card, shadows.floating]} accessibilityRole="alert" onPress={() => undefined}>
          <AppText variant="cardTitle">{current.title}</AppText>
          {current.message ? <AppText color={colors.textSecondary}>{current.message}</AppText> : null}
          <View style={styles.actions}>
            {current.resolve ? (
              <>
                <Button label="Άκυρο" variant="ghost" size="md" onPress={() => close(false)} style={styles.flex} />
                <Button
                  label={current.confirmLabel ?? 'Εντάξει'}
                  variant={current.destructive ? 'danger' : 'primary'}
                  size="md"
                  onPress={() => close(true)}
                  style={styles.flex}
                />
              </>
            ) : (
              <Button label="Εντάξει" size="md" onPress={() => close(true)} />
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: { width: '100%', maxWidth: 420, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  flex: { flex: 1 },
});
