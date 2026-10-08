import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck, Clock, ExternalLink, Euro, FileText, ListPlus, MapPin, Monitor } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BulletList } from '@/components/BulletList';
import { Disclaimer } from '@/components/Disclaimer';
import { MetaItem } from '@/components/MetaItem';
import { OfficialSource } from '@/components/OfficialSource';
import { AppText, Button, Card, EmptyState, ErrorState, Screen, SkeletonList, StackHeader } from '@/components/ui';
import { useBenefits, useProcedure } from '@/hooks/useContent';
import { analytics } from '@/lib/analytics';
import { openOfficialUrl } from '@/lib/linking';
import { taskService } from '@/services/taskService';
import { useTaskStore } from '@/store/taskStore';
import { colors, radius, spacing } from '@/theme';

export default function ProcedureDetail() {
  const { id, benefitId } = useLocalSearchParams<{ id: string; benefitId?: string; taskId?: string }>();
  const { data: procedure, isLoading, isError, refetch } = useProcedure(id);
  const { data: benefits } = useBenefits();
  const existingTask = useTaskStore((s) => s.tasks.find((t) => t.procedureId === id && t.status === 'pending'));
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (id) analytics.track('procedure_started', { contentId: id, contentType: 'procedure' });
  }, [id]);

  if (isLoading) {
    return (
      <Screen header={<StackHeader />}>
        <SkeletonList count={3} />
      </Screen>
    );
  }
  if (isError) {
    return (
      <Screen header={<StackHeader />}>
        <ErrorState onRetry={refetch} />
      </Screen>
    );
  }
  if (!procedure) {
    return (
      <Screen header={<StackHeader />}>
        <EmptyState emoji="🔎" title="Δεν βρήκαμε αυτή τη διαδικασία." />
      </Screen>
    );
  }

  // The benefit this procedure was opened from (or any benefit that points to it) supplies the deadline.
  const relatedBenefit =
    benefits?.find((b) => b.id === benefitId) ?? benefits?.find((b) => b.procedureId === procedure.id && b.deadline);

  const addToTasks = async () => {
    setAdding(true);
    const task = await taskService.create({
      title: procedure.title,
      description: relatedBenefit ? `Για: ${relatedBenefit.title}` : procedure.description,
      dueDate: relatedBenefit?.deadline,
      procedureId: procedure.id,
      benefitId: relatedBenefit?.id,
    });
    setAdding(false);
    router.navigate({ pathname: '/(tabs)/tasks', params: { added: task.id } });
  };

  return (
    <Screen
      header={<StackHeader title="Διαδικασία" />}
      edges={['top', 'bottom']}
      footer={
        <>
          <Button
            label="Άνοιγμα επίσημης υπηρεσίας"
            icon={ExternalLink}
            onPress={() => openOfficialUrl(procedure.officialUrl, { contentId: procedure.id, contentType: 'procedure' })}
          />
          {existingTask ? (
            <Button
              label="Είναι ήδη στις εργασίες σου — Άνοιγμα"
              icon={CircleCheck}
              variant="secondary"
              onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: existingTask.id } })}
            />
          ) : (
            <Button label="Προσθήκη στις εργασίες μου" icon={ListPlus} variant="secondary" onPress={addToTasks} loading={adding} />
          )}
        </>
      }
    >
      <AppText variant="screenTitle">Πώς κάνω {procedure.actionTitle};</AppText>
      <AppText variant="subtitle" color={colors.textSecondary}>
        {procedure.description}
      </AppText>

      <Card>
        <View style={styles.meta}>
          <MetaItem icon={Clock} label="Εκτιμώμενος χρόνος" value={procedure.estimatedTime} />
          <MetaItem icon={Euro} label="Κόστος" value={procedure.cost} />
          <MetaItem icon={procedure.online ? Monitor : MapPin} label="Τρόπος" value={procedure.online ? 'Ηλεκτρονικά' : 'Με φυσική παρουσία'} />
        </View>
      </Card>

      <Card>
        <View style={styles.titleRow}>
          <FileText size={20} color={colors.primary} />
          <AppText variant="cardTitle">Τι θα χρειαστείς</AppText>
        </View>
        <View style={styles.mtMd}>
          <BulletList items={procedure.requiredDocuments} icon={CircleCheck} iconColor={colors.success} />
        </View>
      </Card>

      <View style={styles.steps}>
        <AppText variant="sectionTitle">Βήματα</AppText>
        {procedure.steps.map((step, i) => (
          <View key={step.id} style={styles.step} accessible accessibilityLabel={`Βήμα ${step.order}: ${step.title}${step.description ? `. ${step.description}` : ''}`}>
            <View style={styles.stepRail}>
              <View style={styles.stepNum}>
                <AppText variant="label" color={colors.onPrimary}>
                  {step.order}
                </AppText>
              </View>
              {i < procedure.steps.length - 1 ? <View style={styles.stepLine} /> : null}
            </View>
            <View style={styles.stepBody}>
              <AppText variant="bodyStrong">{step.title}</AppText>
              {step.description ? <AppText color={colors.textSecondary}>{step.description}</AppText> : null}
            </View>
          </View>
        ))}
      </View>

      <OfficialSource source={procedure.source} contentId={procedure.id} contentType="procedure" />
      <Disclaimer text="Τα βήματα είναι ενδεικτικά. Ακολούθησε πάντα τις οδηγίες της επίσημης υπηρεσίας." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { gap: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mtMd: { marginTop: spacing.md },
  steps: { gap: spacing.md },
  step: { flexDirection: 'row', gap: spacing.md },
  stepRail: { alignItems: 'center' },
  stepNum: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepLine: { flex: 1, width: 2, backgroundColor: colors.primaryBorder, marginVertical: spacing.xs, minHeight: 16 },
  stepBody: { flex: 1, gap: spacing.xxs, paddingBottom: spacing.lg, paddingTop: spacing.xs },
});
