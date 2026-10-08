import { ExternalLink, Landmark } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Source } from '@/types/models';
import { formatFullDate } from '@/lib/dates';
import { openOfficialUrl } from '@/lib/linking';
import { colors, radius, spacing, touchTarget } from '@/theme';
import { AppText, Badge } from './ui';

export interface OfficialSourceProps {
  source: Source;
  contentId?: string;
  contentType?: 'benefit' | 'procedure';
}

/**
 * Reusable official-source block. Every benefit and procedure must show one.
 * «Πηγή: [Authority]» · «Τελευταία επιβεβαίωση: [date]» · «Δες την πηγή»
 */
export function OfficialSource({ source, contentId, contentType }: OfficialSourceProps) {
  return (
    <View style={styles.box}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Landmark size={20} color={colors.primary} />
        </View>
        <View style={styles.text}>
          <AppText variant="bodyStrong">Πηγή: {source.authority}</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            Τελευταία επιβεβαίωση: {formatFullDate(source.lastVerified)}
          </AppText>
        </View>
      </View>
      {source.isMock ? <Badge label="Δοκιμαστικά δεδομένα" tone="warning" /> : null}
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Δες την πηγή"
        accessibilityHint={`Ανοίγει τη σελίδα: ${source.authority}`}
        onPress={() => openOfficialUrl(source.url, { contentId, contentType })}
        style={({ pressed }) => [styles.link, pressed && { opacity: 0.7 }]}
      >
        <AppText variant="label" color={colors.primary}>
          Δες την πηγή
        </AppText>
        <ExternalLink size={16} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: spacing.xxs },
  link: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: touchTarget, alignSelf: 'flex-start' },
});
