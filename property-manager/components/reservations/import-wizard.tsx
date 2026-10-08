"use client";

import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status";
import { AMOUNT_MODE_LABELS, detectAmountMode, roomAndCommission, type AmountMode } from "@/lib/import/amounts";
import { autoMap, buildRows, detectDateOrder, FIELD_LABELS, IMPORT_FIELDS, normalizeHeader, REQUIRED_FIELDS, type ColumnMapping, type DateOrder } from "@/lib/import/parse";
import { api, ApiError } from "@/lib/client/api";
import { formatDay, formatMoney } from "@/lib/format";
import { climateFeeForStay, type PropertyKind, type TaxRegime } from "@/lib/tax/gr";

type Source = "BOOKING_COM" | "AIRBNB" | "OTHER";
const SOURCES: { key: Source; label: string; hint: string }[] = [
  { key: "BOOKING_COM", label: "Booking.com", hint: "Extranet → Κρατήσεις → επιλέξτε ημερομηνίες → «Λήψη» (Excel)" },
  { key: "AIRBNB", label: "Airbnb", hint: "Πίνακας ελέγχου οικοδεσπότη → Κρατήσεις → «Εξαγωγή» (CSV)" },
  { key: "OTHER", label: "Άλλο αρχείο", hint: "Οποιοδήποτε Excel/CSV με γραμμή επικεφαλίδων" },
];

interface Property { id: string; name: string; kind: string; areaSqm: number | null; maxGuests: number }
interface Result { created: number; updated: number; failed: number; results: { line: number; outcome: string; message?: string; reservationId?: string }[] }

const today = () => new Date().toISOString().slice(0, 10);

export function ImportWizard({ properties, pricing }: { properties: Property[]; pricing: { regime: TaxRegime; commissionRates: Record<string, number> } }) {
  const [source, setSource] = useState<Source>("BOOKING_COM");
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<unknown[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [dateOrder, setDateOrder] = useState<DateOrder>("DMY");
  const [amountMode, setAmountMode] = useState<AmountMode | null>(null);
  const [listingMap, setListingMap] = useState<Record<string, string>>({});
  const [singleProperty, setSingleProperty] = useState(properties[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function onFile(file: File) {
    setResult(null);
    try {
      const XLSX = await import("xlsx");
      const wb = file.name.toLowerCase().endsWith(".csv")
        ? XLSX.read(await file.text(), { type: "string", cellDates: true })
        : XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const table = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
      // The header row is the one (among the first rows) whose names we recognize best.
      let headerIdx = 0;
      let best = -1;
      table.slice(0, 15).forEach((row, i) => {
        const score = Object.keys(autoMap(row.map((c) => String(c ?? "")))).length;
        if (score > best) [best, headerIdx] = [score, i];
      });
      const head = table[headerIdx].map((c) => String(c ?? "").trim());
      const rows = table.slice(headerIdx + 1);
      const map = autoMap(head);
      setFileName(file.name);
      setHeaders(head);
      setData(rows);
      setMapping(map);
      const dateValues = rows.flatMap((r) => [map.checkIn, map.checkOut].map((i) => (i === undefined ? "" : r[i])));
      setDateOrder(detectDateOrder(dateValues, source === "AIRBNB" ? "MDY" : "DMY"));
      setAmountMode(null);
      // Match each listing/room name to a property by name.
      if (map.listing !== undefined) {
        const names = [...new Set(rows.map((r) => String(r[map.listing!] ?? "").trim()).filter(Boolean))];
        setListingMap(Object.fromEntries(names.map((n) => {
          const nn = normalizeHeader(n);
          const match = properties.find((p) => nn.includes(normalizeHeader(p.name)) || normalizeHeader(p.name).includes(nn));
          return [n, match?.id ?? (properties.length === 1 ? properties[0].id : "")];
        })));
      } else setListingMap({});
    } catch {
      toast.error("Το αρχείο δεν διαβάστηκε. Δοκιμάστε Excel (.xls/.xlsx) ή CSV.");
    }
  }

  const rows = useMemo(() => buildRows(data, mapping, dateOrder, today(), headers), [data, mapping, dateOrder, headers]);
  const propertyFor = (listing: string) => properties.find((p) => p.id === (mapping.listing !== undefined ? listingMap[listing] : singleProperty));
  const rate = pricing.commissionRates[source] ?? 0;
  const withFee = rows.map((r) => {
    const p = propertyFor(r.listing);
    const fee = p && r.checkIn && r.checkOut && r.checkOut > r.checkIn ? climateFeeForStay({ checkIn: r.checkIn, checkOut: r.checkOut, totalAmount: Math.max(r.amount, 1) }, { kind: p.kind as PropertyKind, areaSqm: p.areaSqm }) : 0;
    return { ...r, property: p, climateFee: fee };
  });
  const detected = detectAmountMode(withFee, { ratePercent: rate, source });
  const mode = amountMode ?? detected.mode;
  const preview = withFee.map((r) => {
    const charged = r.status !== "CANCELLED" || (r.commission ?? 0) > 0;
    const calc = charged ? roomAndCommission(mode, r.amount, { commission: r.commission, climateFee: r.climateFee, ratePercent: r.commissionPercent ?? rate, source }) : { room: 0, commission: 0 };
    const problems = [...r.problems, ...(r.property ? [] : ["Διαλέξτε ακίνητο"])];
    return { ...r, ...calc, problems };
  });
  const ready = preview.filter((r) => r.problems.length === 0);
  const missing = REQUIRED_FIELDS.filter((f) => mapping[f] === undefined);

  async function runImport() {
    setBusy(true);
    try {
      const res = await api<Result>("/api/reservations/import", {
        body: {
          source: source === "OTHER" ? "OTHER" : source,
          amountMode: mode,
          rows: ready.map((r) => ({
            line: r.line, externalId: r.externalId, propertyId: r.property!.id, guestName: r.guestName, email: r.email, phone: r.phone, country: r.country,
            checkIn: r.checkIn, checkOut: r.checkOut, guestsCount: r.guestsCount, amount: r.amount, commission: r.commission, commissionPercent: r.commissionPercent, status: r.status, notes: r.notes, details: r.details,
          })),
        },
      });
      setResult(res);
      toast.success(`Εισαγωγή: ${res.created} νέες, ${res.updated} ενημερώθηκαν${res.failed ? `, ${res.failed} με πρόβλημα` : ""}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Η εισαγωγή απέτυχε");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const errors = result.results.filter((r) => r.outcome === "error");
    return (
      <Card>
        <CardHeader title="Η εισαγωγή ολοκληρώθηκε" />
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">{result.created} νέες κρατήσεις</Badge>
            <Badge tone="info">{result.updated} ενημερώθηκαν</Badge>
            {result.failed > 0 && <Badge tone="danger">{result.failed} με πρόβλημα</Badge>}
          </div>
          {errors.length > 0 && (
            <ul className="grid gap-1 text-sm">
              {errors.map((e) => <li key={e.line} className="text-danger">Γραμμή {e.line}: {e.message}</li>)}
            </ul>
          )}
          <p className="text-[13px] text-muted-foreground">Αν ξανακάνετε εισαγωγή το ίδιο αρχείο αργότερα, οι κρατήσεις ενημερώνονται με βάση τον αριθμό κράτησης — δεν διπλασιάζονται.</p>
          <div className="flex gap-2">
            <Button asChild><Link href="/reservations">Στις κρατήσεις</Link></Button>
            <Button variant="outline" onClick={() => { setResult(null); setFileName(null); setData([]); }}>Νέα εισαγωγή</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader title="1. Από πού είναι το αρχείο;" />
        <CardContent className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {SOURCES.map((s) => (
              <button key={s.key} type="button" onClick={() => setSource(s.key)}
                className={`rounded-xl border p-3 text-left transition ${source === s.key ? "border-accent bg-accent-soft/40" : "border-border hover:bg-muted"}`}>
                <div className="font-medium">{s.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.hint}</div>
              </button>
            ))}
          </div>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border-strong bg-muted/30 p-6 text-center hover:bg-muted/60">
            {fileName ? <FileSpreadsheet className="size-6 text-accent" /> : <Upload className="size-6 text-muted-foreground" />}
            <span className="text-sm font-medium">{fileName ?? "Επιλέξτε αρχείο Excel ή CSV"}</span>
            <span className="text-xs text-muted-foreground">Το αρχείο διαβάζεται στον browser σας· στέλνονται μόνο οι κρατήσεις που επιβεβαιώνετε.</span>
            <input type="file" accept=".xls,.xlsx,.csv" className="sr-only" onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])} />
          </label>
        </CardContent>
      </Card>

      {fileName && (
        <Card>
          <CardHeader title="2. Αντιστοίχιση στηλών" description={`Βρέθηκαν ${rows.length} γραμμές. Διορθώστε ό,τι δεν αναγνωρίστηκε σωστά.`} />
          <CardContent className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {IMPORT_FIELDS.map((f) => (
                <Field key={f} label={`${FIELD_LABELS[f]}${REQUIRED_FIELDS.includes(f) ? " *" : ""}`} htmlFor={`map-${f}`}>
                  <Select id={`map-${f}`} value={mapping[f] ?? ""} onChange={(e) => setMapping({ ...mapping, [f]: e.target.value === "" ? undefined : Number(e.target.value) })}>
                    <option value="">—</option>
                    {headers.map((h, i) => <option key={i} value={i}>{h || `Στήλη ${i + 1}`}</option>)}
                  </Select>
                </Field>
              ))}
            </div>
            {missing.length > 0 && <p className="text-sm text-danger">Λείπουν: {missing.map((f) => FIELD_LABELS[f]).join(", ")}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Τι είναι το «Ποσό»;" htmlFor="amountMode" hint={detected.detected && !amountMode ? "Εντοπίστηκε αυτόματα από τις προμήθειες του αρχείου." : undefined}>
                <Select id="amountMode" value={mode} onChange={(e) => setAmountMode(e.target.value as AmountMode)}>
                  {(Object.keys(AMOUNT_MODE_LABELS) as AmountMode[]).map((m) => <option key={m} value={m}>{AMOUNT_MODE_LABELS[m]}</option>)}
                </Select>
              </Field>
              <Field label="Μορφή ημερομηνιών" htmlFor="dateOrder">
                <Select id="dateOrder" value={dateOrder} onChange={(e) => setDateOrder(e.target.value as DateOrder)}>
                  <option value="DMY">Ημέρα/Μήνας/Έτος (11/10/2026)</option>
                  <option value="MDY">Μήνας/Ημέρα/Έτος (10/11/2026)</option>
                </Select>
              </Field>
            </div>
          </CardContent>
        </Card>
      )}

      {fileName && missing.length === 0 && (
        <Card>
          <CardHeader title="3. Σε ποιο ακίνητο;" />
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {mapping.listing !== undefined ? (
              Object.keys(listingMap).map((name) => (
                <Field key={name} label={name} htmlFor={`l-${name}`}>
                  <Select id={`l-${name}`} value={listingMap[name]} onChange={(e) => setListingMap({ ...listingMap, [name]: e.target.value })}>
                    <option value="">Παράλειψη</option>
                    {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </Field>
              ))
            ) : (
              <Field label="Όλες οι κρατήσεις του αρχείου αφορούν το ακίνητο" htmlFor="singleProperty">
                <Select id="singleProperty" value={singleProperty} onChange={(e) => setSingleProperty(e.target.value)}>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
            )}
          </CardContent>
        </Card>
      )}

      {fileName && missing.length === 0 && (
        <Card>
          <CardHeader title="4. Προεπισκόπηση" description={`${ready.length} από ${preview.length} κρατήσεις είναι έτοιμες. Οι υπόλοιπες παραλείπονται.`}
            action={<Button loading={busy} disabled={!ready.length} onClick={runImport}><Upload /> Εισαγωγή {ready.length} κρατήσεων</Button>} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="border-y border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Γραμμή</th><th className="px-4 py-2">Επισκέπτης</th><th className="px-4 py-2">Ακίνητο</th><th className="px-4 py-2">Διαμονή</th>
                  <th className="px-4 py-2">Κατάσταση</th><th className="px-4 py-2 text-right">Ποσό αρχείου</th><th className="px-4 py-2 text-right">Τιμή δωματίου</th>
                  <th className="px-4 py-2 text-right">ΤΑΚΚ</th><th className="px-4 py-2 text-right">Προμήθεια</th><th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.slice(0, 200).map((r) => (
                  <tr key={r.line} className={r.problems.length ? "bg-danger-soft/40" : undefined}>
                    <td className="px-4 py-2 text-muted-foreground">{r.line}</td>
                    <td className="px-4 py-2"><div className="font-medium">{r.guestName || "—"}</div><div className="text-xs text-muted-foreground">{r.externalId}</div></td>
                    <td className="px-4 py-2">{r.property?.name ?? "—"}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{r.checkIn && r.checkOut ? `${formatDay(r.checkIn, { day: "numeric", month: "short" })} → ${formatDay(r.checkOut, { day: "numeric", month: "short", year: "numeric" })}` : "—"}</td>
                    <td className="px-4 py-2"><StatusBadge value={r.status} /></td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatMoney(r.amount)}</td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums">{formatMoney(r.room)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.room > 0 ? formatMoney(r.climateFee) : "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatMoney(r.commission)}</td>
                    <td className="px-4 py-2">
                      {r.problems.length ? (
                        <span className="flex items-center gap-1 text-xs text-danger"><AlertTriangle className="size-3.5" />{r.problems.join(" · ")}</span>
                      ) : (
                        <CheckCircle2 className="size-4 text-success" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
