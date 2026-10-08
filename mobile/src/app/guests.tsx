import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { LinkRow, SearchBox } from "@/components/form";
import { Button, Card, Empty, ErrorBox, Loading, Screen } from "@/components/ui";
import { languageName } from "@/lib/constants";
import type { Guest } from "@/lib/types";
import { useQuery } from "@/lib/use-query";

export default function Guests() {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);
  const { data, error, loading, refreshing, reload } = useQuery<Guest[]>(`/api/guests${q ? `?q=${encodeURIComponent(q)}` : ""}`);

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <Stack.Screen options={{ title: "Επισκέπτες", headerRight: () => <Button small title="Νέος" onPress={() => router.push("/guest/new")} /> }} />
      <SearchBox value={text} onChange={setText} placeholder="Όνομα, email ή τηλέφωνο" />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data ? (
        <Loading />
      ) : (
        <Card style={{ paddingVertical: 4 }}>
          {data && data.length === 0 && <Empty title="Δεν βρέθηκαν επισκέπτες" />}
          {(data ?? []).map((g, i) => (
            <LinkRow key={g.id} first={i === 0} title={g.fullName}
              subtitle={[g.email ?? g.phone, g.country, `μηνύματα: ${languageName(g.language)}`].filter(Boolean).join(" · ")}
              onPress={() => router.push(`/guest/${g.id}`)} />
          ))}
        </Card>
      )}
    </Screen>
  );
}
