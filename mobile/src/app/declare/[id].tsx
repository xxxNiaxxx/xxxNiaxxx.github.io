import { Stack, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { ErrorBox, Loading } from "@/components/ui";
import { AADE_PORTAL_URL } from "@/lib/aade";
import { getBaseUrl } from "@/lib/api";
import type { StayTax } from "@/lib/types";
import { useQuery } from "@/lib/use-query";
import { colors } from "@/theme";

/** Declaration fields the autofill script fills (same keys as the web's autofillPayload). */
const AUTOFILL_KEYS = ["checkIn", "checkOut", "amount", "paymentMethod", "platform", "foreigner", "taxId", "guestName", "idNumber", "cancelAmount", "cancelDate", "bookingNumber"];

/**
 * The AADE site inside the app. The host signs in to TAXISnet and opens the
 * new declaration as usual; «Συμπλήρωση φόρμας» then fills the form with this
 * stay's values. The host checks it and submits it on the AADE page. The app
 * neither reads the login nor submits anything.
 */
export default function Declare() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading } = useQuery<{ tax: StayTax | null }>(`/api/reservations/${id}`);
  const web = useRef<WebView>(null);
  const [status, setStatus] = useState<{ text: string; tone: "info" | "ok" | "warn" }>({
    text: "Μπείτε με τους κωδικούς Taxisnet, επιλέξτε το ακίνητο και πατήστε «Υποβολή Νέας Δήλωσης». Μετά πατήστε «Συμπλήρωση φόρμας».",
    tone: "info",
  });
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <Loading />;
  if (error || !data?.tax) return <ErrorBox message={error ?? "Η κράτηση δεν χρειάζεται δήλωση."} />;

  const values: Record<string, string> = {};
  for (const f of data.tax.declarationForm.fields) if (f.value && AUTOFILL_KEYS.includes(f.key)) values[f.key] = f.value;

  const fill = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${getBaseUrl()}/api/aade/autofill-script`);
      if (!res.ok) throw new Error();
      const script = await res.text();
      web.current?.injectJavaScript(`window.__AADE_AUTOFILL__ = ${JSON.stringify(values)};\n${script}\ntrue;`);
    } catch {
      setStatus({ text: "Δεν φορτώθηκε η αυτόματη συμπλήρωση. Ελέγξτε τη σύνδεση στο internet και ξαναδοκιμάστε.", tone: "warn" });
      setBusy(false);
    }
  };

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type?: string; done?: string[]; failed?: string[] };
      if (msg.type !== "aade-autofill") return;
      setBusy(false);
      const done = msg.done ?? [];
      const failed = msg.failed ?? [];
      if (done.length === 0)
        setStatus({ text: "Δεν βρέθηκε η φόρμα. Ανοίξτε πρώτα «Υποβολή Νέας Δήλωσης» και ξαναπατήστε «Συμπλήρωση φόρμας».", tone: "warn" });
      else
        setStatus({
          text: `Συμπληρώθηκαν ${done.length} πεδία.${failed.length ? ` Συμπληρώστε με το χέρι: ${failed.join(", ")}.` : ""} Ελέγξτε και πατήστε «Ενέργειες» → «Υποβολή».`,
          tone: failed.length ? "warn" : "ok",
        });
    } catch {
      // Not ours: other pages may post messages too.
    }
  };

  const tone = { info: [colors.infoSoft, colors.info], ok: [colors.successSoft, colors.success], warn: [colors.warningSoft, colors.warning] }[status.tone];
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: "Δήλωση στην ΑΑΔΕ" }} />
      <View style={{ padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ backgroundColor: tone[0], color: tone[1], padding: 10, borderRadius: 10, fontSize: 13, lineHeight: 18 }}>{status.text}</Text>
        <Pressable
          onPress={fill}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => ({ backgroundColor: colors.primary, opacity: busy || pressed ? 0.7 : 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" })}
        >
          <Text style={{ color: colors.onPrimary, fontWeight: "700", fontSize: 15 }}>{busy ? "Συμπλήρωση…" : "✨ Συμπλήρωση φόρμας"}</Text>
        </Pressable>
      </View>
      <WebView
        ref={web}
        source={{ uri: AADE_PORTAL_URL }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        setSupportMultipleWindows={false}
        style={{ flex: 1 }}
      />
    </View>
  );
}
