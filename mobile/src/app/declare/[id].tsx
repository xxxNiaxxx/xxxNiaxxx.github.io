import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { ErrorBox, Loading } from "@/components/ui";
import { AADE_PORTAL_URL } from "@/lib/aade";
import { api, getBaseUrl } from "@/lib/api";
import type { StayTax } from "@/lib/types";
import { useQuery } from "@/lib/use-query";
import { colors } from "@/theme";

/** Declaration fields the autofill script fills (same keys as the web's autofillPayload). */
const AUTOFILL_KEYS = ["checkIn", "checkOut", "amount", "paymentMethod", "platform", "foreigner", "taxId", "guestName", "idNumber", "cancelAmount", "cancelDate", "bookingNumber"];

/** The AADE page with the new declaration form (opened from «Υποβολή Νέας Δήλωσης»). */
const DECLARATION_FORM = /short_term_letting\/views\/declaration\.xhtml/;

/**
 * The AADE site inside the app. The host signs in to TAXISnet and opens the
 * new declaration as usual; as soon as the form opens it is filled with this
 * stay's values («Συμπλήρωση φόρμας» does it again). The host checks it and
 * submits it on the AADE page, then marks the stay as declared here. The app
 * neither reads the login nor submits anything.
 */
export default function Declare() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading } = useQuery<{ tax: StayTax | null }>(`/api/reservations/${id}`);
  const web = useRef<WebView>(null);
  const [status, setStatus] = useState<{ text: string; tone: "info" | "ok" | "warn" }>({
    text: "Μπείτε με τους κωδικούς Taxisnet, επιλέξτε το ακίνητο και πατήστε «Υποβολή Νέας Δήλωσης». Η φόρμα θα συμπληρωθεί μόνη της.",
    tone: "info",
  });
  const [busy, setBusy] = useState(false);
  const [filled, setFilled] = useState(false);
  const [declared, setDeclared] = useState(false);
  // Filled once on its own when the form opens; after that only with the button (e.g. not over a submitted form).
  const autoFilled = useRef(false);
  const script = useRef<Promise<string> | null>(null);
  const loadScript = () => {
    script.current ??= fetch(`${getBaseUrl()}/api/aade/autofill-script`).then((res) => {
      if (!res.ok) throw new Error();
      return res.text();
    });
    script.current.catch(() => (script.current = null));
    return script.current;
  };
  useEffect(() => {
    void loadScript().catch(() => {});
  }, []);

  if (loading && !data) return <Loading />;
  if (error || !data?.tax) return <ErrorBox message={error ?? "Η κράτηση δεν χρειάζεται δήλωση."} />;

  const values: Record<string, string> = {};
  for (const f of data.tax.declarationForm.fields) if (f.value && AUTOFILL_KEYS.includes(f.key)) values[f.key] = f.value;

  const fill = async () => {
    setBusy(true);
    setStatus({ text: "Συμπλήρωση της φόρμας…", tone: "info" });
    try {
      const code = await loadScript();
      web.current?.injectJavaScript(`window.__AADE_AUTOFILL__ = ${JSON.stringify(values)};\n${code}\ntrue;`);
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
      else {
        setFilled(true);
        setStatus({
          text: `Συμπληρώθηκαν ${done.length} πεδία.${failed.length ? ` Συμπληρώστε με το χέρι: ${failed.join(", ")}.` : ""} Ελέγξτε και πατήστε «Ενέργειες» → «Υποβολή».`,
          tone: failed.length ? "warn" : "ok",
        });
      }
    } catch {
      // Not ours: other pages may post messages too.
    }
  };

  const markDeclared = async () => {
    try {
      await api(`/api/reservations/${id}/declaration`, { body: { status: "DECLARED" } });
      setDeclared(true);
      setStatus({ text: "Η κράτηση σημειώθηκε ως δηλωμένη.", tone: "ok" });
    } catch {
      setStatus({ text: "Δεν σημειώθηκε. Ελέγξτε τη σύνδεση και ξαναδοκιμάστε.", tone: "warn" });
    }
  };

  const onLoadEnd = (url: string) => {
    if (autoFilled.current || !DECLARATION_FORM.test(url)) return;
    autoFilled.current = true;
    // Give the form's own scripts a moment to set up its fields.
    setTimeout(() => void fill(), 800);
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
          <Text style={{ color: colors.onPrimary, fontWeight: "700", fontSize: 15 }}>
            {busy ? "Συμπλήρωση…" : filled ? "✨ Ξανά συμπλήρωση" : "✨ Συμπλήρωση φόρμας"}
          </Text>
        </Pressable>
        {filled && !declared ? (
          <Pressable
            onPress={markDeclared}
            accessibilityRole="button"
            style={({ pressed }) => ({ borderWidth: 1, borderColor: colors.primary, opacity: pressed ? 0.7 : 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" })}
          >
            <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 14 }}>✓ Την υπέβαλα: σημείωση ως δηλωμένη</Text>
          </Pressable>
        ) : null}
      </View>
      <WebView
        ref={web}
        source={{ uri: AADE_PORTAL_URL }}
        onMessage={onMessage}
        onLoadEnd={(e) => onLoadEnd(e.nativeEvent.url)}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        setSupportMultipleWindows={false}
        style={{ flex: 1 }}
      />
    </View>
  );
}
