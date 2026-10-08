import { Search as SearchIcon, X } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { BenefitCard } from '@/components/BenefitCard';
import { categoryIcons } from '@/components/categoryIcons';
import { ProcedureCard } from '@/components/ProcedureCard';
import { AppText, Badge, Chip, EmptyState, ErrorState, Screen, SectionHeader, SkeletonList } from '@/components/ui';
import { useBenefits, useProcedures } from '@/hooks/useContent';
import { useEligibilityMap } from '@/hooks/useRecommendations';
import { analytics } from '@/lib/analytics';
import { searchContent, type SearchResult } from '@/lib/search';
import type { Category } from '@/types/models';
import { colors, maxFontScale, radius, spacing, typography } from '@/theme';

interface QuickCategory {
  id: string;
  label: string;
  /** null = all benefits («Επιδόματα»). */
  category: Category | null;
}

const QUICK_CATEGORIES: QuickCategory[] = [
  { id: 'benefits', label: 'Επιδόματα', category: null },
  { id: 'unemployment', label: 'Ανεργία', category: 'unemployment' },
  { id: 'family', label: 'Παιδιά', category: 'family' },
  { id: 'housing', label: 'Στέγαση', category: 'housing' },
  { id: 'vehicle', label: 'Αυτοκίνητο', category: 'vehicle' },
  { id: 'tax', label: 'Φορολογία', category: 'tax' },
];

function ResultItem({ result, status }: { result: SearchResult; status?: ReturnType<typeof useEligibilityMap>[string] }) {
  if (result.kind === 'procedure') return <ProcedureCard procedure={result.item} showTypeBadge />;
  return (
    <View style={styles.resultWrap}>
      <Badge label="Παροχή" tone="primary" />
      <BenefitCard benefit={result.item} status={status ?? 'UNKNOWN'} />
    </View>
  );
}

export default function SearchScreen() {
  const benefitsQuery = useBenefits();
  const proceduresQuery = useProcedures();
  const statuses = useEligibilityMap();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<QuickCategory | null>(null);
  const inputRef = useRef<TextInput>(null);
  const lastTracked = useRef('');

  const loading = benefitsQuery.isLoading || proceduresQuery.isLoading;
  const error = benefitsQuery.isError || proceduresQuery.isError;
  const benefits = benefitsQuery.data ?? [];
  const procedures = proceduresQuery.data ?? [];

  const results = useMemo<SearchResult[]>(() => {
    if (category) {
      const b: SearchResult[] = benefits
        .filter((x) => x.status !== 'closed' && (category.category === null || x.category === category.category))
        .map((item) => ({ kind: 'benefit', item, score: 1 }));
      const p: SearchResult[] =
        category.category === null ? [] : procedures.filter((x) => x.category === category.category).map((item) => ({ kind: 'procedure', item, score: 1 }));
      const base = [...b, ...p];
      if (!query.trim()) return base;
      const ids = new Set(searchContent(query, benefits, procedures).map((r) => r.item.id));
      return base.filter((r) => ids.has(r.item.id));
    }
    return query.trim().length >= 2 ? searchContent(query, benefits, procedures) : [];
  }, [benefits, procedures, query, category]);

  const track = () => {
    const key = `${category?.id ?? ''}|${query.trim()}`;
    if (key === lastTracked.current || key === '|') return;
    lastTracked.current = key;
    analytics.track('search_performed', { resultCount: results.length, screen: category ? 'category' : 'text' });
  };

  const active = Boolean(category) || query.trim().length >= 2;

  return (
    <Screen>
      <AppText variant="screenTitle">Τι ψάχνεις;</AppText>

      <View style={styles.searchBox}>
        <SearchIcon size={20} color={colors.textMuted} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={track}
          onBlur={track}
          placeholder="Π.χ. “Τι δικαιούμαι ως άνεργος;”"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          returnKeyType="search"
          accessibilityLabel="Αναζήτηση παροχών και διαδικασιών"
          maxFontSizeMultiplier={maxFontScale}
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Καθαρισμός αναζήτησης" onPress={() => setQuery('')} hitSlop={10} style={styles.clear}>
            <X size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {QUICK_CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            label={c.label}
            icon={c.category ? categoryIcons[c.category] : undefined}
            selected={category?.id === c.id}
            onPress={() => {
              const next = category?.id === c.id ? null : c;
              setCategory(next);
              if (next) analytics.track('search_performed', { screen: 'category' });
            }}
          />
        ))}
      </ScrollView>

      {loading ? (
        <SkeletonList count={3} />
      ) : error ? (
        <ErrorState
          onRetry={() => {
            benefitsQuery.refetch();
            proceduresQuery.refetch();
          }}
        />
      ) : !active ? (
        <View style={styles.section}>
          <SectionHeader title="Δημοφιλείς διαδικασίες" />
          {procedures.slice(0, 4).map((p) => (
            <ProcedureCard key={p.id} procedure={p} />
          ))}
        </View>
      ) : results.length === 0 ? (
        <EmptyState emoji="🔍" title="Δεν βρήκαμε αποτελέσματα." message="Δοκίμασε άλλες λέξεις ή ρώτησε τον βοηθό." />
      ) : (
        <View style={styles.section}>
          <AppText variant="caption" color={colors.textMuted} accessibilityLiveRegion="polite">
            {results.length === 1 ? '1 αποτέλεσμα' : `${results.length} αποτελέσματα`}
          </AppText>
          {results.map((r) => (
            <ResultItem key={`${r.kind}:${r.item.id}`} result={r} status={statuses[r.item.id]} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: { ...typography.body, flex: 1, color: colors.text, paddingVertical: spacing.md },
  clear: { padding: spacing.xs },
  chips: { gap: spacing.sm, paddingRight: spacing.xl },
  section: { gap: spacing.md },
  resultWrap: { gap: spacing.xs },
});
