import { router } from 'expo-router';
import { Clock } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import type { Procedure } from '@/types/models';
import { colors, spacing } from '@/theme';
import { AppText, Badge, Card } from './ui';

export function ProcedureCard({ procedure, showTypeBadge = false }: { procedure: Procedure; showTypeBadge?: boolean }) {
  return (
    <Card
      onPress={() => router.push({ pathname: '/procedures/[id]', params: { id: procedure.id } })}
      accessibilityLabel={`Διαδικασία: ${procedure.title}`}
      accessibilityHint="Ανοίγει τα βήματα της διαδικασίας"
    >
      <View style={styles.body}>
        {showTypeBadge ? <Badge label="Διαδικασία" tone="accent" /> : null}
        <AppText variant="cardTitle">{procedure.title}</AppText>
        <AppText color={colors.textSecondary} numberOfLines={2}>
          {procedure.description}
        </AppText>
        <View style={styles.meta}>
          <Clock size={14} color={colors.textMuted} />
          <AppText variant="caption" color={colors.textMuted}>
            {procedure.estimatedTime} · {procedure.online ? 'Ηλεκτρονικά' : 'Με φυσική παρουσία'}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
