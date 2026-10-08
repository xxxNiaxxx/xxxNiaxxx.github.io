import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { LinkRow, SearchBox, Segmented } from "@/components/form";
import { Badge, Button, Card, Empty, ErrorBox, Loading, Screen } from "@/components/ui";
import { formatMoney, humanize } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { Property } from "@/lib/types";
import { useQuery } from "@/lib/use-query";

export default function Properties() {
  const { session } = useSession();
  const [status, setStatus] = useState<"" | "ACTIVE" | "INACTIVE">("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);
  const params = new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}) }).toString();
  const { data, error, loading, refreshing, reload } = useQuery<Property[]>(`/api/properties${params ? `?${params}` : ""}`);
  const canAdd = session?.role === "OWNER" || session?.role === "ADMIN";

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Stack.Screen options={{ title: "Ακίνητα", headerRight: canAdd ? () => <Button small title="Νέο" onPress={() => router.push("/property/new")} /> : undefined }} />
      <SearchBox value={text} onChange={setText} placeholder="Όνομα, πόλη ή διεύθυνση" />
      <Segmented options={[{ key: "", label: "Όλα" }, { key: "ACTIVE", label: "Ενεργά" }, { key: "INACTIVE", label: "Ανενεργά" }]} value={status} onChange={setStatus} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data ? (
        <Loading />
      ) : (
        <Card style={{ paddingVertical: 4 }}>
          {data && data.length === 0 && <Empty title="Δεν βρέθηκαν ακίνητα" />}
          {(data ?? []).map((p, i) => (
            <LinkRow
              key={p.id}
              first={i === 0}
              title={p.name}
              subtitle={`${p.city} · ${p.bedrooms} υπν. · έως ${p.maxGuests} άτομα · ${formatMoney(p.basePrice, p.currency)}/νύχτα${p.ama ? ` · ΑΜΑ ${p.ama}` : " · χωρίς ΑΜΑ"}`}
              onPress={() => router.push(`/property/${p.id}`)}
              right={<View><Badge label={humanize(p.status)} tone={p.status === "ACTIVE" ? "success" : "neutral"} /></View>}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}
