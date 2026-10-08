import { Stack } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { NumberField, SelectField, TextField, CheckRow } from "@/components/form";
import { Button, Card, Screen, SectionTitle, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { COMMISSION_SOURCES } from "@/lib/constants";
import { humanize } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useMutation } from "@/lib/use-mutation";
import type { TaxSettings } from "@/lib/types";
import { useQuery } from "@/lib/use-query";

export default function Settings() {
  const { session, serverUrl, refresh, switchOrganization } = useSession();
  const tax = useQuery<TaxSettings>("/api/tax/settings");
  const orgInfo = useQuery<{ emailReminders: boolean }>("/api/organization");
  const profile = useMutation();
  const org = useMutation();
  const regime = useMutation();
  const [name, setName] = useState(session?.user.name ?? "");
  const [orgName, setOrgName] = useState(session?.organization.name ?? "");
  const [switching, setSwitching] = useState(false);
  if (!session) return null;
  const admin = session.role === "OWNER" || session.role === "ADMIN";

  return (
    <Screen>
      <Stack.Screen options={{ title: "Ρυθμίσεις" }} />
      <Card style={{ gap: 12 }}>
        <SectionTitle title="Προφίλ" />
        <TextField label="Το όνομά σας" value={name} onChangeText={setName} error={profile.fieldErrors.name} />
        <Text style={styles.rowSub}>{session.user.email} · {humanize(session.role)}</Text>
        <Button small title="Αποθήκευση" loading={profile.pending} disabled={name.trim() === (session.user.name ?? "")} style={{ alignSelf: "flex-start" }}
          onPress={() => void profile.run(() => api("/api/me", { method: "PATCH", body: { name } }), { onSuccess: () => void refresh() })} />
      </Card>

      <Card style={{ gap: 12 }}>
        <SectionTitle title="Οργανισμός" />
        <TextField label="Όνομα οργανισμού" value={orgName} onChangeText={setOrgName} editable={admin} error={org.fieldErrors.name}
          hint={admin ? undefined : "Μόνο ο ιδιοκτήτης και οι διαχειριστές το αλλάζουν"} />
        {admin && (
          <Button small title="Αποθήκευση" loading={org.pending} disabled={orgName.trim() === session.organization.name} style={{ alignSelf: "flex-start" }}
            onPress={() => void org.run(() => api("/api/organization", { method: "PATCH", body: { name: orgName } }), { onSuccess: () => void refresh() })} />
        )}
        {orgInfo.data && (
          <CheckRow label="Υπενθυμίσεις με email (προθεσμίες, διπλοκρατήσεις, αιτήματα) και μηνιαία αναφορά" value={orgInfo.data.emailReminders}
            onChange={(v) => admin && void org.run(() => api("/api/organization", { method: "PATCH", body: { emailReminders: v } }), { onSuccess: () => void orgInfo.reload() })} />
        )}
        {session.organizations.length > 1 && (
          <SelectField label="Ενεργός οργανισμός" value={session.organization.id}
            hint={switching ? "Αλλαγή…" : "Τα δεδομένα κάθε ομάδας είναι ξεχωριστά"}
            options={session.organizations.map((o) => ({ value: o.id, label: o.name, detail: humanize(o.role) }))}
            onChange={async (id) => {
              setSwitching(true);
              try {
                await switchOrganization(id);
                const next = session.organizations.find((o) => o.id === id);
                setOrgName(next?.name ?? "");
              } finally {
                setSwitching(false);
              }
            }} />
        )}
      </Card>

      {tax.data && (
        <Card style={{ gap: 12 }}>
          <SectionTitle title="Φορολογικό καθεστώς" />
          {!admin ? (
            <Text style={styles.rowSub}>{humanize(tax.data.regime)} · {tax.data.propertiesWithAma} ακίνητα με ΑΜΑ</Text>
          ) : (
          <SelectField label="Καθεστώς" value={tax.data.setting}
            hint={`Τώρα: ${humanize(tax.data.regime)} · ${tax.data.propertiesWithAma} ακίνητα με ΑΜΑ. Αυτόματα: επιχείρηση από τον 3ο ΑΜΑ.`}
            options={[{ value: "AUTO", label: "Αυτόματο" }, { value: "INDIVIDUAL", label: "Ιδιώτης (Ε2)" }, { value: "BUSINESS", label: "Επιχείρηση (ΦΠΑ, τέλος παρεπιδημούντων)" }]}
            onChange={(v) => void regime.run(() => api("/api/tax/settings", { method: "PATCH", body: { taxRegime: v } }), { onSuccess: () => void tax.reload() })} />
          )}
        </Card>
      )}

      {tax.data && admin && <PricingCard settings={tax.data} onSaved={tax.reload} />}

      {__DEV__ && (
        <View>
          <Text style={[styles.rowSub, { textAlign: "center" }]}>Server: {serverUrl}</Text>
        </View>
      )}
    </Screen>
  );
}

function PricingCard({ settings, onSaved }: { settings: TaxSettings; onSaved: () => void }) {
  const { run, pending } = useMutation();
  const [rates, setRates] = useState<Record<string, string>>(() =>
    Object.fromEntries(COMMISSION_SOURCES.map((s) => [s, String(settings.commissionRates[s] ?? 0)])),
  );
  const [ownRate, setOwnRate] = useState(settings.businessTaxRate == null ? "" : String(settings.businessTaxRate));
  return (
    <Card style={{ gap: 12 }}>
      <SectionTitle title="Προμήθειες & φόρος" />
      {COMMISSION_SOURCES.map((s) => (
        <NumberField key={s} label={`Προμήθεια ${humanize(s)} (%)`} value={rates[s]} onChange={(v) => setRates((r) => ({ ...r, [s]: v }))}
          hint={s === "BOOKING_COM" ? "Υπολογίζεται στην τιμή δωματίου χωρίς το τέλος 0,5% — όχι στο ΤΑΚΚ" : undefined} />
      ))}
      {settings.regime === "BUSINESS" && (
        <NumberField label="Δικός σας συντελεστής φόρου εισοδήματος (%)" value={ownRate} onChange={setOwnRate} placeholder="κλίμακα"
          hint="Κενό = εκτίμηση από την κλίμακα επιχειρήσεων (χωρίς εισφορές ΕΦΚΑ)" />
      )}
      <Button small title="Αποθήκευση" loading={pending} style={{ alignSelf: "flex-start" }}
        onPress={() => void run(() => api("/api/tax/settings", {
          method: "PATCH",
          body: { commissionRates: Object.fromEntries(COMMISSION_SOURCES.map((s) => [s, Number(rates[s]) || 0])), ...(settings.regime === "BUSINESS" ? { businessTaxRate: ownRate === "" ? null : Number(ownRate) } : {}) },
        }), { onSuccess: onSaved })} />
    </Card>
  );
}
