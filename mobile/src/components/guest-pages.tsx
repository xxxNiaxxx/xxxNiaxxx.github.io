import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Linking, Text, View } from "react-native";
import { CheckRow } from "@/components/form";
import { Button, Card, SectionTitle, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { PriceSuggestion, Property } from "@/lib/types";
import { notify, useMutation } from "@/lib/use-mutation";
import { useQuery } from "@/lib/use-query";
import { colors } from "@/theme";

/** Guest guide and direct booking page of a property. */
export function GuestPagesCard({ property, admin, onChanged }: { property: Property; admin: boolean; onChanged: () => void }) {
  const { serverUrl } = useSession();
  const { run, pending } = useMutation();
  const [links, setLinks] = useState<{ guidePath: string; bookingPath: string } | null>(
    property.publicToken && property.bookingToken ? { guidePath: `/guide/${property.publicToken}`, bookingPath: `/book/${property.bookingToken}` } : null,
  );
  const url = (kind: "guide" | "book") => `${serverUrl}${kind === "guide" ? links!.guidePath : links!.bookingPath}`;
  const share = async (link: string) => {
    await Clipboard.setStringAsync(link);
    notify("Ο σύνδεσμος αντιγράφηκε");
  };

  return (
    <Card style={{ gap: 8 }}>
      <SectionTitle title="Σελίδες για επισκέπτες" />
      {!links ? (
        <>
          <Text style={styles.rowSub}>Οδηγός επισκέπτη (Wi-Fi, check-in, κανόνες) και σελίδα απευθείας κρατήσεων χωρίς προμήθεια.</Text>
          <Button small title="Δημιουργία σελίδων" loading={pending} disabled={!admin} style={{ alignSelf: "flex-start" }}
            onPress={() => void run(() => api<{ guidePath: string; bookingPath: string }>(`/api/properties/${property.id}/public-pages`, { method: "POST" }), { onSuccess: setLinks })} />
        </>
      ) : (
        <>
          <Text style={styles.rowTitle}>Οδηγός επισκέπτη</Text>
          <Text style={styles.rowSub}>Μόνο για επισκέπτες· μη γράφετε κωδικούς πόρτας στις πληροφορίες.</Text>
          <Text style={styles.rowSub} numberOfLines={1}>{url("guide")}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button small variant="outline" title="Αντιγραφή" onPress={() => void share(url("guide"))} />
            <Button small variant="ghost" title="Άνοιγμα" onPress={() => Linking.openURL(url("guide"))} />
          </View>
          <CheckRow label="Απευθείας κρατήσεις (αιτήματα που εγκρίνετε εσείς)" value={property.directBooking}
            onChange={(v) => void run(() => api(`/api/properties/${property.id}/public-pages`, { method: "PATCH", body: { directBooking: v } }), { onSuccess: onChanged })} />
          {property.directBooking && (
            <>
              <Text style={styles.rowSub} numberOfLines={1}>{url("book")}</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button small variant="outline" title="Αντιγραφή" onPress={() => void share(url("book"))} />
                <Button small variant="ghost" title="Άνοιγμα" onPress={() => Linking.openURL(url("book"))} />
              </View>
            </>
          )}
        </>
      )}
    </Card>
  );
}

export function PriceIdeasList({ items, showProperty }: { items: PriceSuggestion[]; showProperty?: boolean }) {
  if (!items.length) return <Text style={styles.rowSub}>Καμία πρόταση αυτή τη στιγμή.</Text>;
  return (
    <>
      {items.map((s, i) => (
        <View key={i} style={[styles.row, i === 0 && { borderTopWidth: 0 }, { alignItems: "flex-start" }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{showProperty ? `${s.propertyName}: ` : ""}{s.title}</Text>
            <Text style={styles.rowSub}>{s.detail}</Text>
          </View>
          {s.price !== undefined && <Text style={{ fontWeight: "700", color: colors.text }}>{s.price} €</Text>}
        </View>
      ))}
    </>
  );
}

/** Price ideas for one property, from its calendar. */
export function PriceIdeasCard({ propertyId }: { propertyId: string }) {
  const { data } = useQuery<PriceSuggestion[]>(`/api/properties/${propertyId}/price-suggestions`);
  if (!data) return null;
  return (
    <Card>
      <SectionTitle title="Προτάσεις τιμών" />
      <PriceIdeasList items={data} />
      <Text style={[styles.rowSub, { marginTop: 6 }]}>Την τιμή την αλλάζετε σε κάθε πλατφόρμα.</Text>
    </Card>
  );
}
