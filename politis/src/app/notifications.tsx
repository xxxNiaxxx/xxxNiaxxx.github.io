import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, EmptyState, Screen, StackHeader } from '@/components/ui';
import { analytics } from '@/lib/analytics';
import { formatDayMonth } from '@/lib/dates';
import { useNotificationStore } from '@/store/notificationStore';
import type { InAppNotification } from '@/types/models';
import { colors, radius, spacing, touchTarget } from '@/theme';

function Item({ n }: { n: InAppNotification }) {
  const markRead = useNotificationStore((s) => s.markRead);
  const open = () => {
    markRead(n.id);
    analytics.track('notification_opened', { contentType: n.taskId ? 'task' : 'benefit' });
    if (n.taskId) router.push({ pathname: '/tasks/[id]', params: { id: n.taskId } });
    else if (n.benefitId) router.push({ pathname: '/benefits/[id]', params: { id: n.benefitId } });
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${n.read ? '' : 'Νέα. '}${n.title}. ${n.body}`}
      onPress={open}
      style={({ pressed }) => [styles.item, !n.read && styles.unread, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.icon, !n.read && { backgroundColor: colors.primary }]}>
        <Bell size={18} color={n.read ? colors.primary : colors.onPrimary} />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{n.title}</AppText>
        <AppText color={colors.textSecondary}>{n.body}</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {formatDayMonth(n.createdAt)}
        </AppText>
      </View>
      {!n.read ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

export default function Notifications() {
  const items = useNotificationStore((s) => s.items);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const hasUnread = items.some((i) => !i.read);

  return (
    <Screen header={<StackHeader title="Ειδοποιήσεις" />}>
      <AppText variant="screenTitle">Ειδοποιήσεις</AppText>
      {items.length === 0 ? (
        <EmptyState emoji="🔔" title="Καμία ειδοποίηση" message="Θα σε ενημερώνουμε εδώ όταν πλησιάζει μια προθεσμία." />
      ) : (
        <>
          {hasUnread ? <Button label="Σήμανση όλων ως αναγνωσμένων" variant="ghost" size="md" fullWidth={false} onPress={markAllRead} /> : null}
          <View style={styles.list}>
            {items.map((n) => (
              <Item key={n.id} n={n} />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  item: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    padding: spacing.lg,
    minHeight: touchTarget,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  unread: { borderColor: colors.primaryBorder, backgroundColor: colors.primarySoft },
  icon: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: spacing.xxs },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: spacing.sm },
});
