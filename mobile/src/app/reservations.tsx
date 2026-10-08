import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { LinkRow, SearchBox, Segmented } from "@/components/form";
import { Badge, Button, Card, Empty, ErrorBox, Loading, Screen, statusTone, styles } from "@/components/ui";
import { formatDay, formatMoney, humanize } from "@/lib/format";
import type { Reservation } from "@/lib/types";
import { useQuery } from "@/lib/use-query";

const FILTERS = [
  { key: "", label: "Όλες" },
  { key: "CONFIRMED", label: "Επιβεβαιωμένες" },
  { key: "PENDING", label: "Εκκρεμούν" },
  { key: "COMPLETED", label: "Ολοκληρώθηκαν" },
  { key: "CANCELLED", label: "Ακυρώθηκαν" },
] as const;

export default function Reservations() {
  const [status, setStatus] = useState<(typeof FILTERS)[number]["key"]>("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);
  const params = new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}) }).toString();
  const { data, error, loading, refreshing, reload } = useQuery<Reservation[]>(`/api/reservations${params ? `?${params}` : ""}`);

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Stack.Screen options={{ title: "Κρατήσεις", headerRight: () => <Button small title="Νέα" onPress={() => router.push("/reservation/new")} /> }} />
      <SearchBox value={text} onChange={setText} placeholder="Επισκέπτης, ακίνητο ή κωδικός" />
      <Segmented options={[...FILTERS]} value={status} onChange={setStatus} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data ? (
        <Loading />
      ) : (
        <Card style={{ paddingVertical: 4 }}>
          {data && data.length === 0 && <Empty title="Δεν βρέθηκαν κρατήσεις" detail={q || status ? "Δοκιμάστε άλλη αναζήτηση." : "Προσθέστε την πρώτη σας κράτηση."} />}
          {(data ?? []).map((r, i) => (
            <LinkRow
              key={r.id}
              first={i === 0}
              title={r.guestName ?? "—"}
              subtitle={`${r.propertyName} · ${formatDay(r.checkIn)} → ${formatDay(r.checkOut)} · ${r.nights} νύχτες`}
              onPress={() => router.push(`/reservation/${r.id}`)}
              right={
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={[styles.rowTitle, { fontSize: 14 }]}>{r.complimentary ? "Δωρεάν" : r.fromCalendar && r.totalAmount === 0 ? "Λείπει ποσό" : formatMoney(r.totalAmount, r.currency)}</Text>
                  <Badge label={humanize(r.status)} tone={statusTone[r.status]} />
                </View>
              }
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}
