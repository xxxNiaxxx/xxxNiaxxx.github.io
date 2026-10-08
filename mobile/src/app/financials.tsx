import { router, Stack } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Badge, Button, Card, ErrorBox, Loading, Screen, SectionTitle, Stat, styles } from "@/components/ui";
import { formatDay, formatMoney, formatPercent, humanize } from "@/lib/format";
import type { RevenueSummary, Transaction } from "@/lib/types";
import { useQuery } from "@/lib/use-query";
import { colors } from "@/theme";

const MONTHS = ["Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος", "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"];
const pad = (n: number) => String(n).padStart(2, "0");

export default function Financials() {
  const now = new Date();
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 });
  const from = `${month.y}-${pad(month.m)}-01`;
  const next = month.m === 12 ? { y: month.y + 1, m: 1 } : { y: month.y, m: month.m + 1 };
  const to = `${next.y}-${pad(next.m)}-01`;
  const summary = useQuery<RevenueSummary>(`/api/financials/summary?from=${from}&to=${to}`);
  const tx = useQuery<Transaction[]>(`/api/transactions?from=${from}&to=${to}`);
  const shift = (d: number) => setMonth(({ y, m }) => (m + d > 12 ? { y: y + 1, m: 1 } : m + d < 1 ? { y: y - 1, m: 12 } : { y, m: m + d }));
  const s = summary.data;

  return (
    <Screen refreshing={summary.refreshing} onRefresh={() => { void summary.reload(); void tx.reload(); }}>
      <Stack.Screen options={{ title: "Οικονομικά", headerRight: () => <Button small title="Κίνηση" onPress={() => router.push("/transaction/new")} /> }} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <Button small variant="outline" title="‹" onPress={() => shift(-1)} />
        <Text style={[styles.sectionTitle, { minWidth: 160, textAlign: "center" }]}>{MONTHS[month.m - 1]} {month.y}</Text>
        <Button small variant="outline" title="›" onPress={() => shift(1)} />
      </View>
      {summary.error && <ErrorBox message={summary.error} onRetry={summary.reload} />}
      {!s ? (
        <Loading />
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <Stat label="Έσοδα" value={formatMoney(s.income, s.currency)} />
            <Stat label="Έξοδα" value={formatMoney(s.expenses, s.currency)} />
            <Stat label="Καθαρά" value={formatMoney(s.net, s.currency)} />
            <Stat label="Πληρότητα" value={formatPercent(s.occupancy)} hint={`${s.bookedNights} / ${s.availableNights} νύχτες`} />
          </View>
          <Card>
            <SectionTitle title="Ανά ακίνητο" />
            {s.byProperty.map((p, i) => (
              <View key={p.propertyId} style={[styles.row, i === 0 && { borderTopWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{p.name}</Text>
                  <Text style={styles.rowSub}>έσοδα {formatMoney(p.income, s.currency)} · έξοδα {formatMoney(p.expenses, s.currency)} · πληρότητα {formatPercent(p.occupancy)}</Text>
                </View>
                <Text style={[styles.rowTitle, p.net < 0 && { color: colors.danger }]}>{formatMoney(p.net, s.currency)}</Text>
              </View>
            ))}
          </Card>
          {s.byCategory.length > 0 && (
            <Card>
              <SectionTitle title="Ανά κατηγορία" />
              {s.byCategory.map((c, i) => (
                <View key={c.category} style={[styles.row, i === 0 && { borderTopWidth: 0 }]}>
                  <Text style={[styles.rowTitle, { flex: 1 }]}>{humanize(c.category)}</Text>
                  {c.income > 0 && <Text style={{ color: colors.success, fontWeight: "600" }}>+{formatMoney(c.income, s.currency)}</Text>}
                  {c.expenses > 0 && <Text style={{ color: colors.danger, fontWeight: "600" }}>−{formatMoney(c.expenses, s.currency)}</Text>}
                </View>
              ))}
            </Card>
          )}
        </>
      )}
      <Card>
        <SectionTitle title="Κινήσεις" count={tx.data?.length} />
        {tx.data && tx.data.length === 0 && <Text style={styles.rowSub}>Καμία κίνηση τον μήνα αυτό.</Text>}
        {(tx.data ?? []).map((t, i) => (
          <View key={t.id} style={[styles.row, i === 0 && { borderTopWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{t.description || humanize(t.category)}</Text>
              <Text style={styles.rowSub}>{formatDay(t.transactionDate)} · {t.propertyName} · {humanize(t.category)}</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text style={{ fontWeight: "700", color: t.type === "INCOME" ? colors.success : colors.danger }}>{t.type === "INCOME" ? "+" : "−"}{formatMoney(t.amount, t.currency)}</Text>
              {t.reservationId && <Badge label="Κράτηση" />}
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
