import { router, Stack } from "expo-router";
import { useState } from "react";
import { Linking, Text, View } from "react-native";
import { LinkRow, NumberField, Segmented } from "@/components/form";
import { Badge, Button, Card, ErrorBox, Loading, Screen, SectionTitle, Stat, styles, type Tone } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDay, formatMoney, humanize } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useMutation } from "@/lib/use-mutation";
import { useQuery } from "@/lib/use-query";
import { colors } from "@/theme";

interface Stay {
  reservationId: string;
  propertyName: string;
  ama: string | null;
  guestName: string;
  status: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  declaration: { deadline: string; overdue: boolean; daysLeft: number };
}
interface Month {
  period: string;
  nights: number;
  gross: number;
  climateFee: number;
  climateFeeDeadline: string;
  climateFeeFiled: { amount: number } | null;
  climateFeeOverdue: boolean;
  vat: number;
  presenceFee: number;
  vatFiled: boolean;
  presenceFeeFiled: boolean;
  closed: boolean;
}
interface Overview {
  regime: "INDIVIDUAL" | "BUSINESS";
  regimeSetting: string;
  propertiesWithAma: number;
  pendingDeclarations: Stay[];
  monthly: Month[];
  compliance: { propertyId: string; name: string; ama: string | null; missing: string[]; insuranceExpiresOn: string | null; insuranceStatus: string }[];
  warnings: { level: "high" | "medium" | "low"; title: string; detail: string }[];
  totals: { declarationsOverdue: number; declarationsDue: number; climateFeeUnfiled: number };
}
interface Annual {
  year: number;
  regime: "INDIVIDUAL" | "BUSINESS";
  byProperty: { propertyId: string; name: string; ama: string | null; stays: number; nights: number; gross: number; climateFee: number; expenses: number }[];
  climateFeeCollected: number;
  individual: { gross: number; deduction: number; taxable: number; estimatedTax: number };
  effectiveTaxRate: number;
  business: { revenueExVat: number; vat: number; presenceFee: number; expenses: number; profitBeforeTax: number; estimatedTax: number; profitAfterTax: number; taxRateSource: "SETTING" | "SCALE" };
}

const MONTHS = ["Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος", "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"];
const monthName = (period: string) => `${MONTHS[Number(period.slice(5, 7)) - 1]} ${period.slice(0, 4)}`;
const levelTone: Record<string, Tone> = { high: "danger", medium: "warning", low: "info" };

export default function Tax() {
  const [tab, setTab] = useState<"obligations" | "annual" | "compliance">("obligations");
  return (
    <>
      <Stack.Screen options={{ title: "Φορολογικά & ΑΑΔΕ" }} />
      {tab === "annual" ? <AnnualTab tabs={<Tabs tab={tab} setTab={setTab} />} /> : <OverviewTab tab={tab} tabs={<Tabs tab={tab} setTab={setTab} />} />}
    </>
  );
}

function Tabs({ tab, setTab }: { tab: "obligations" | "annual" | "compliance"; setTab: (t: "obligations" | "annual" | "compliance") => void }) {
  return (
    <Segmented
      options={[{ key: "obligations", label: "Υποχρεώσεις" }, { key: "annual", label: "Ετήσια (Ε2)" }, { key: "compliance", label: "Προδιαγραφές" }]}
      value={tab}
      onChange={setTab}
    />
  );
}

function OverviewTab({ tab, tabs }: { tab: "obligations" | "compliance"; tabs: React.ReactNode }) {
  const { serverUrl } = useSession();
  const { data, error, loading, refreshing, reload } = useQuery<Overview>("/api/tax/overview");
  const { run, pending } = useMutation();
  const declare = (id: string, status: "DECLARED" | "NOT_REQUIRED") => run(() => api(`/api/reservations/${id}/declaration`, { body: { status } }), { onSuccess: () => void reload() });
  const file = (kind: string, period: string, amount: number) => run(() => api("/api/tax/filings", { body: { kind, period, amount } }), { onSuccess: () => void reload() });
  const unfile = (kind: string, period: string) => run(() => api(`/api/tax/filings?kind=${kind}&period=${period}`, { method: "DELETE" }), { onSuccess: () => void reload() });

  if (loading && !data) return <Loading />;
  if (!data) return <Screen>{tabs}{error && <ErrorBox message={error} onRetry={reload} />}</Screen>;

  if (tab === "compliance") {
    return (
      <Screen refreshing={refreshing} onRefresh={reload}>
        {tabs}
        <Card style={{ paddingVertical: 4 }}>
          {data.compliance.map((c, i) => (
            <LinkRow key={c.propertyId} first={i === 0} title={c.name}
              subtitle={[
                c.ama ? `ΑΜΑ ${c.ama}` : "Χωρίς ΑΜΑ",
                c.missing.length ? `Λείπουν: ${c.missing.join(", ")}` : "Όλες οι προδιαγραφές ✓",
                c.insuranceStatus === "MISSING" ? "Χωρίς ασφάλιση" : c.insuranceStatus === "EXPIRED" ? "Η ασφάλιση έληξε" : c.insuranceExpiresOn ? `Ασφάλιση έως ${formatDay(c.insuranceExpiresOn, false)}` : null,
              ].filter(Boolean).join(" · ")}
              right={<Badge label={c.missing.length || !c.ama || c.insuranceStatus !== "OK" ? "Εκκρεμεί" : "OK"} tone={c.missing.length || !c.ama || c.insuranceStatus !== "OK" ? "warning" : "success"} />}
              onPress={() => router.push(`/property/${c.propertyId}`)} />
          ))}
        </Card>
      </Screen>
    );
  }

  const months = data.monthly.filter((m) => m.climateFee > 0 || m.gross > 0);
  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      {tabs}
      <Text style={styles.rowSub}>
        Καθεστώς: <Text style={{ fontWeight: "700", color: colors.text }}>{humanize(data.regime)}</Text> · {data.propertiesWithAma} ακίνητα με ΑΜΑ
        {data.regimeSetting === "AUTO" ? " (αυτόματα)" : ""}
        {" · "}
        <Text style={{ color: colors.accent, fontWeight: "600" }} onPress={() => Linking.openURL(`${serverUrl}/help#foros`)}>Πώς υπολογίζονται;</Text>
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <Stat label="Δηλώσεις διαμονής" value={data.totals.declarationsDue} hint={data.totals.declarationsOverdue ? `${data.totals.declarationsOverdue} εκπρόθεσμες` : "καμία εκπρόθεσμη"} />
        <Stat label="ΤΑΚΚ προς απόδοση" value={formatMoney(data.totals.climateFeeUnfiled)} hint="κλεισμένοι μήνες" />
      </View>

      {data.warnings.length > 0 && (
        <Card>
          <SectionTitle title="Προσοχή" count={data.warnings.length} />
          {data.warnings.map((w, i) => (
            <View key={i} style={[styles.row, i === 0 && { borderTopWidth: 0 }, { alignItems: "flex-start" }]}>
              <Badge label={w.level === "high" ? "Σημαντικό" : w.level === "medium" ? "Σύντομα" : "Πληροφορία"} tone={levelTone[w.level]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{w.title}</Text>
                <Text style={styles.rowSub}>{w.detail}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      <Card>
        <SectionTitle title="Δηλώσεις διαμονής" count={data.pendingDeclarations.length} />
        <Text style={styles.rowSub}>Έως τις 20 του επόμενου μήνα από την αναχώρηση, στο Μητρώο Βραχυχρόνιας Διαμονής (myAADE).</Text>
        {data.pendingDeclarations.length === 0 && <Text style={[styles.rowSub, { marginTop: 8 }]}>Όλες οι διαμονές έχουν δηλωθεί.</Text>}
        {data.pendingDeclarations.map((s) => (
          <View key={s.reservationId} style={[styles.row, { flexWrap: "wrap" }]}>
            <View style={{ flex: 1, minWidth: 160 }}>
              <Text style={styles.rowTitle} onPress={() => router.push(`/reservation/${s.reservationId}`)}>{s.guestName}</Text>
              <Text style={styles.rowSub}>{s.propertyName} · {s.ama ?? "χωρίς ΑΜΑ"} · {formatDay(s.checkIn, false)} → {formatDay(s.checkOut, false)}</Text>
              <View style={{ marginTop: 4 }}>
                <Badge label={`${s.declaration.overdue ? "Εκπρόθεσμη · " : "Έως "}${formatDay(s.declaration.deadline, false)}`} tone={s.declaration.overdue ? "danger" : s.declaration.daysLeft <= 7 ? "warning" : "neutral"} />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 6 }}>
              <Button small variant="ghost" title="Δεν απαιτείται" disabled={pending} onPress={() => declare(s.reservationId, "NOT_REQUIRED")} />
              <Button small variant="outline" title="Δηλώθηκε" disabled={pending} onPress={() => declare(s.reservationId, "DECLARED")} />
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <SectionTitle title="ΤΑΚΚ ανά μήνα" />
        <Text style={styles.rowSub}>Μηνιαία δήλωση στο myAADE έως την τελευταία ημέρα του επόμενου μήνα. Οι νύχτες κάθε μήνα μετρούν στον δικό τους μήνα.</Text>
        {months.length === 0 && <Text style={[styles.rowSub, { marginTop: 8 }]}>Δεν υπάρχουν διανυκτερεύσεις.</Text>}
        {months.map((m) => (
          <View key={m.period} style={[styles.row, { flexWrap: "wrap" }]}>
            <View style={{ flex: 1, minWidth: 160 }}>
              <Text style={styles.rowTitle}>{monthName(m.period)}</Text>
              <Text style={styles.rowSub}>{m.nights} νύχτες · ΤΑΚΚ {formatMoney(m.climateFee)} · έως {formatDay(m.climateFeeDeadline, false)}</Text>
              {data.regime === "BUSINESS" && <Text style={styles.rowSub}>ΦΠΑ {formatMoney(m.vat)}{m.vatFiled ? " ✓" : ""} · Τέλος παρεπιδημούντων {formatMoney(m.presenceFee)}{m.presenceFeeFiled ? " ✓" : ""}</Text>}
            </View>
            {m.climateFeeFiled ? (
              <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                <Badge label="Αποδόθηκε" tone="success" />
                <Button small variant="ghost" title="Αναίρεση" disabled={pending} onPress={() => unfile("CLIMATE_FEE", m.period)} />
              </View>
            ) : m.closed && m.climateFee > 0 ? (
              <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                {m.climateFeeOverdue && <Badge label="Εκπρόθεσμο" tone="danger" />}
                <Button small variant="outline" title="Αποδόθηκε" disabled={pending} onPress={() => file("CLIMATE_FEE", m.period, m.climateFee)} />
              </View>
            ) : (
              <Badge label={m.closed ? "—" : "Τρέχων μήνας"} />
            )}
            {data.regime === "BUSINESS" && m.closed && (m.vat > 0 || m.presenceFee > 0) && (
              <View style={{ flexDirection: "row", gap: 6, width: "100%", marginTop: 6 }}>
                <Button small variant={m.vatFiled ? "ghost" : "outline"} title={m.vatFiled ? "ΦΠΑ ✓ (αναίρεση)" : "ΦΠΑ αποδόθηκε"} disabled={pending}
                  onPress={() => (m.vatFiled ? unfile("VAT", m.period) : file("VAT", m.period, m.vat))} />
                <Button small variant={m.presenceFeeFiled ? "ghost" : "outline"} title={m.presenceFeeFiled ? "Τέλος ✓ (αναίρεση)" : "Τέλος αποδόθηκε"} disabled={pending}
                  onPress={() => (m.presenceFeeFiled ? unfile("PRESENCE_FEE", m.period) : file("PRESENCE_FEE", m.period, m.presenceFee))} />
              </View>
            )}
          </View>
        ))}
      </Card>
      <Text style={[styles.rowSub, { textAlign: "center" }]}>Οι εξαγωγές CSV για τον λογιστή υπάρχουν στην εφαρμογή web.</Text>
    </Screen>
  );
}

function AnnualTab({ tabs }: { tabs: React.ReactNode }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [other, setOther] = useState("");
  const [otherApplied, setOtherApplied] = useState(0);
  const { data, error, loading, refreshing, reload } = useQuery<Annual>(`/api/tax/annual?year=${year}&otherIncome=${otherApplied}`);

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      {tabs}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <Button small variant="outline" title="‹" onPress={() => setYear((y) => y - 1)} />
        <Text style={[styles.sectionTitle, { fontSize: 20 }]}>{year}</Text>
        <Button small variant="outline" title="›" onPress={() => setYear((y) => y + 1)} />
      </View>
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data ? (
        <Loading />
      ) : data ? (
        <>
          {data.regime === "INDIVIDUAL" ? (
            <Card style={{ gap: 2 }}>
              <SectionTitle title="Εκτίμηση Ε2 (ιδιώτης)" />
              <Row label="Ακαθάριστο μίσθωμα" value={formatMoney(data.individual.gross)} />
              <Row label="Έκπτωση 5% κατ' αποκοπή" value={`− ${formatMoney(data.individual.deduction)}`} />
              <Row label="Φορολογητέο" value={formatMoney(data.individual.taxable)} />
              <Row label="Εκτιμώμενος φόρος" value={formatMoney(data.individual.estimatedTax)} strong />
              <View style={{ marginTop: 10, gap: 8 }}>
                <NumberField label="Άλλα εισοδήματα από ακίνητα (€)" value={other} onChange={setOther} hint="Μοιράζονται την ίδια κλίμακα φόρου" />
                <Button small variant="outline" title="Υπολογισμός" onPress={() => setOtherApplied(Number(other) || 0)} style={{ alignSelf: "flex-start" }} />
              </View>
            </Card>
          ) : (
            <Card style={{ gap: 2 }}>
              <SectionTitle title="Επιχειρηματική δραστηριότητα" />
              <Row label="Έσοδα χωρίς ΦΠΑ" value={formatMoney(data.business.revenueExVat)} />
              <Row label="ΦΠΑ 13%" value={formatMoney(data.business.vat)} />
              <Row label="Τέλος παρεπιδημούντων" value={formatMoney(data.business.presenceFee)} />
              <Row label="Έξοδα" value={formatMoney(data.business.expenses)} />
              <Row label="Κέρδος προ φόρων" value={formatMoney(data.business.profitBeforeTax)} strong />
              <Row label={`Φόρος εισοδήματος (εκτίμηση ${Math.round(data.effectiveTaxRate * 1000) / 10}%)`} value={formatMoney(data.business.estimatedTax)} />
              <Row label="Καθαρά μετά φόρων" value={formatMoney(data.business.profitAfterTax)} strong />
              <Text style={styles.rowSub}>{data.business.taxRateSource === "SETTING" ? "Με τον δικό σας συντελεστή (Ρυθμίσεις)." : "Από την κλίμακα επιχειρήσεων, χωρίς εισφορές ΕΦΚΑ."}</Text>
            </Card>
          )}
          <Card>
            <SectionTitle title="Ανά ακίνητο" />
            {data.byProperty.map((p, i) => (
              <View key={p.propertyId} style={[styles.row, i === 0 && { borderTopWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{p.name}</Text>
                  <Text style={styles.rowSub}>{p.ama ? `ΑΜΑ ${p.ama}` : "Χωρίς ΑΜΑ"} · {p.stays} διαμονές · {p.nights} νύχτες · ΤΑΚΚ {formatMoney(p.climateFee)}</Text>
                </View>
                <Text style={styles.rowTitle}>{formatMoney(p.gross)}</Text>
              </View>
            ))}
            <Text style={[styles.rowSub, { marginTop: 8 }]}>ΤΑΚΚ έτους: {formatMoney(data.climateFeeCollected)}</Text>
          </Card>
          <Text style={[styles.rowSub, { textAlign: "center" }]}>Εκτίμηση — επιβεβαιώστε με τον λογιστή σας.</Text>
        </>
      ) : null}
    </Screen>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text style={[styles.rowSub, { marginTop: 0 }, strong && { color: colors.text, fontWeight: "700" }]}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: strong ? "700" : "500" }}>{value}</Text>
    </View>
  );
}
