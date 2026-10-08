import { router } from 'expo-router';
import { ChevronRight, FileText, Send, Sparkles } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { EligibilityBadge } from '@/components/EligibilityBadge';
import { AppText, Badge, Button, Chip } from '@/components/ui';
import { createId } from '@/lib/id';
import { logger } from '@/lib/logger';
import { PLUS_NAME } from '@/lib/brand';
import { FREE_ASSISTANT_QUESTIONS_PER_MONTH } from '@/lib/premium';
import { assistantService } from '@/services/assistant';
import { usePremium, usePremiumStore } from '@/store/premiumStore';
import { useProfileStore } from '@/store/profileStore';
import { useTaskStore } from '@/store/taskStore';
import type { AssistantResponse } from '@/types/models';
import { colors, maxFontScale, radius, screenPadding, spacing, touchTarget, typography } from '@/theme';

const SUGGESTED_PROMPTS = [
  'Τι δικαιούμαι;',
  'Τι πρέπει να κάνω αυτή την εβδομάδα;',
  'Έχω ένα παιδί. Τι παροχές υπάρχουν;',
  'Πώς κάνω αλλαγή διεύθυνσης;',
];

type Message =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; response: AssistantResponse }
  | { id: string; role: 'error'; question: string }
  | { id: string; role: 'limit' };

function AssistantBubble({ response }: { response: AssistantResponse }) {
  return (
    <View style={[styles.bubble, styles.assistantBubble]}>
      <AppText>{response.answer}</AppText>

      {response.recommendations.length > 0 ? (
        <View style={styles.block}>
          <AppText variant="label" color={colors.textSecondary}>
            Παροχές που μπορεί να σε αφορούν
          </AppText>
          {response.recommendations.map((r) => (
            <Pressable
              key={r.benefitId}
              accessibilityRole="button"
              accessibilityLabel={r.title}
              onPress={() => router.push({ pathname: '/benefits/[id]', params: { id: r.benefitId } })}
              style={({ pressed }) => [styles.ref, pressed && { backgroundColor: colors.surfaceMuted }]}
            >
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{r.title}</AppText>
                <View style={styles.mtXs}>
                  <EligibilityBadge status={r.eligibility} short />
                </View>
              </View>
              <ChevronRight size={20} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {response.procedures.length > 0 ? (
        <View style={styles.block}>
          <AppText variant="label" color={colors.textSecondary}>
            Διαδικασίες
          </AppText>
          {response.procedures.map((p) => (
            <Pressable
              key={p.procedureId}
              accessibilityRole="button"
              accessibilityLabel={p.title}
              onPress={() => router.push({ pathname: '/procedures/[id]', params: { id: p.procedureId } })}
              style={({ pressed }) => [styles.ref, pressed && { backgroundColor: colors.surfaceMuted }]}
            >
              <FileText size={18} color={colors.accent} />
              <AppText variant="bodyStrong" style={styles.flex}>
                {p.title}
              </AppText>
              <ChevronRight size={20} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {response.sources.length > 0 ? (
        <AppText variant="caption" color={colors.textMuted}>
          Πηγές: {Array.from(new Set(response.sources.map((s) => s.authority))).join(' · ')}
        </AppText>
      ) : null}
    </View>
  );
}

export default function Assistant() {
  const profile = useProfileStore((s) => s.profile);
  const tasks = useTaskStore((s) => s.tasks);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const isMock = assistantService.mode === 'mock';
  const { isPlus, remaining, canAskAssistant } = usePremium();
  const recordQuestion = usePremiumStore((s) => s.recordAssistantQuestion);

  const ask = async (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;
    setInput('');
    setMessages((m) => [...m, { id: createId('msg'), role: 'user', text }]);
    if (!canAskAssistant) {
      setMessages((m) => [...m, { id: createId('msg'), role: 'limit' }]);
      return;
    }
    setThinking(true);
    try {
      const response = await assistantService.ask(text, {
        profile,
        pendingTasks: tasks.filter((t) => t.status === 'pending').map((t) => ({ title: t.title, dueDate: t.dueDate })),
      });
      setMessages((m) => [...m, { id: createId('msg'), role: 'assistant', response }]);
      recordQuestion();
    } catch (error) {
      logger.error('assistant.ask', error);
      setMessages((m) => [...m, { id: createId('msg'), role: 'error', question: text }]);
    } finally {
      setThinking(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          <View style={styles.head}>
            <View style={styles.headIcon}>
              <Sparkles size={24} color={colors.accent} />
            </View>
            <AppText variant="screenTitle">Ο βοηθός σου</AppText>
            <AppText variant="subtitle" color={colors.textSecondary}>
              Ρώτησέ με για παροχές, διαδικασίες και υποχρεώσεις.
            </AppText>
            {isMock ? <Badge label="Δοκιμαστική λειτουργία — προκαθορισμένες απαντήσεις" tone="warning" /> : null}
            {isPlus ? (
              <Badge label={`${PLUS_NAME} · απεριόριστες ερωτήσεις`} tone="accent" />
            ) : (
              <Badge label={`${remaining} από ${FREE_ASSISTANT_QUESTIONS_PER_MONTH} δωρεάν ερωτήσεις αυτόν τον μήνα`} tone="neutral" />
            )}
          </View>

          {messages.length === 0 ? (
            <View style={styles.suggestions}>
              <AppText variant="label" color={colors.textSecondary}>
                Δοκίμασε να ρωτήσεις
              </AppText>
              {SUGGESTED_PROMPTS.map((p) => (
                <Chip key={p} label={p} onPress={() => ask(p)} />
              ))}
            </View>
          ) : null}

          {messages.map((m) =>
            m.role === 'user' ? (
              <View key={m.id} style={[styles.bubble, styles.userBubble]}>
                <AppText color={colors.onPrimary}>{m.text}</AppText>
              </View>
            ) : m.role === 'assistant' ? (
              <AssistantBubble key={m.id} response={m.response} />
            ) : m.role === 'limit' ? (
              <View key={m.id} style={[styles.bubble, styles.assistantBubble]}>
                <AppText variant="bodyStrong">Έφτασες τις {FREE_ASSISTANT_QUESTIONS_PER_MONTH} δωρεάν ερωτήσεις αυτού του μήνα.</AppText>
                <AppText color={colors.textSecondary}>
                  Με το {PLUS_NAME} ρωτάς όσο θέλεις. Οι παροχές, ο έλεγχος επιλεξιμότητας και οι διαδικασίες μένουν πάντα δωρεάν.
                </AppText>
                <Button label={`Δες το ${PLUS_NAME}`} size="md" fullWidth={false} onPress={() => router.push('/plus')} />
              </View>
            ) : (
              <View key={m.id} style={[styles.bubble, styles.assistantBubble]} accessibilityRole="alert">
                <AppText variant="bodyStrong">Κάτι πήγε στραβά.</AppText>
                <AppText color={colors.textSecondary}>Δεν μπορέσαμε να φορτώσουμε αυτή την πληροφορία.</AppText>
                <Button label="Δοκίμασε ξανά" variant="secondary" size="md" fullWidth={false} onPress={() => ask(m.question)} />
              </View>
            ),
          )}

          {thinking ? (
            <View style={[styles.bubble, styles.assistantBubble, styles.thinking]} accessibilityLabel="Ο βοηθός σκέφτεται">
              <ActivityIndicator color={colors.accent} />
              <AppText color={colors.textSecondary}>Σκέφτομαι…</AppText>
            </View>
          ) : null}

          <AppText variant="caption" color={colors.textMuted} align="center">
            Οι απαντήσεις είναι ενημερωτικές. Η επιλεξιμότητα υπολογίζεται με σταθερούς κανόνες και η τελική απόφαση ανήκει στον αρμόδιο φορέα.
          </AppText>
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Γράψε την ερώτησή σου…"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            maxLength={500}
            accessibilityLabel="Ερώτηση προς τον βοηθό"
            maxFontSizeMultiplier={maxFontScale}
            onSubmitEditing={() => ask(input)}
            submitBehavior="submit"
            returnKeyType="send"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Αποστολή"
            accessibilityState={{ disabled: !input.trim() || thinking }}
            disabled={!input.trim() || thinking}
            onPress={() => ask(input)}
            style={({ pressed }) => [styles.send, (!input.trim() || thinking) && styles.sendDisabled, pressed && { backgroundColor: colors.primaryPressed }]}
          >
            <Send size={20} color={colors.onPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: screenPadding, gap: spacing.lg, paddingBottom: spacing.xxl },
  head: { gap: spacing.sm },
  headIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  suggestions: { gap: spacing.sm, alignItems: 'flex-start' },
  bubble: { padding: spacing.lg, borderRadius: radius.lg, gap: spacing.md, maxWidth: '92%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: radius.sm },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: radius.sm },
  thinking: { flexDirection: 'row', alignItems: 'center' },
  block: { gap: spacing.sm },
  ref: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    minHeight: touchTarget,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mtXs: { marginTop: spacing.xs },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    ...typography.body,
    flex: 1,
    minHeight: touchTarget + 4,
    maxHeight: 120,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
  },
  send: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.4 },
});
