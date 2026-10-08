import { router } from "expo-router";
import { useState } from "react";
import { NumberField, SelectField, TextField } from "@/components/form";
import { Button, Card, Screen } from "@/components/ui";
import { api } from "@/lib/api";
import type { Property } from "@/lib/types";
import { goBack, useMutation } from "@/lib/use-mutation";

const num = (v: string) => (v.trim() === "" ? undefined : Number(v));

export function PropertyForm({ property }: { property?: Property }) {
  const editing = Boolean(property);
  const { run, pending, fieldErrors: err } = useMutation();
  const [f, setF] = useState({
    name: property?.name ?? "",
    address: property?.address ?? "",
    city: property?.city ?? "",
    country: property?.country ?? "Ελλάδα",
    bedrooms: String(property?.bedrooms ?? 1),
    bathrooms: String(property?.bathrooms ?? 1),
    maxGuests: String(property?.maxGuests ?? 2),
    basePrice: property ? String(property.basePrice) : "",
    ama: property?.ama ?? "",
    kind: property?.kind ?? "APARTMENT",
    areaSqm: property?.areaSqm ? String(property.areaSqm) : "",
    description: property?.description ?? "",
    checkInTime: property?.checkInTime ?? "15:00",
    checkOutTime: property?.checkOutTime ?? "11:00",
    houseRules: property?.houseRules ?? "",
  });
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  async function save() {
    const body = {
      ...f,
      bedrooms: num(f.bedrooms),
      bathrooms: num(f.bathrooms),
      maxGuests: num(f.maxGuests),
      basePrice: num(f.basePrice),
      areaSqm: f.areaSqm.trim() === "" ? null : Number(f.areaSqm),
    };
    await run(() => api<Property>(editing ? `/api/properties/${property!.id}` : "/api/properties", { method: editing ? "PATCH" : "POST", body }), {
      onSuccess: (p) => (editing ? goBack(`/property/${p.id}`) : router.replace(`/property/${p.id}`)),
    });
  }

  return (
    <Screen>
      <Card style={{ gap: 14 }}>
        <TextField label="Όνομα" value={f.name} onChangeText={set("name")} error={err.name} placeholder="π.χ. Villa Elia" />
        <TextField label="Διεύθυνση" value={f.address} onChangeText={set("address")} error={err.address} />
        <TextField label="Πόλη / περιοχή" value={f.city} onChangeText={set("city")} error={err.city} />
        <TextField label="Χώρα" value={f.country} onChangeText={set("country")} error={err.country} />
      </Card>
      <Card style={{ gap: 14 }}>
        <NumberField label="Υπνοδωμάτια" value={f.bedrooms} onChange={set("bedrooms")} keyboardType="number-pad" error={err.bedrooms} />
        <NumberField label="Μπάνια" value={f.bathrooms} onChange={set("bathrooms")} keyboardType="number-pad" error={err.bathrooms} />
        <NumberField label="Μέγιστοι επισκέπτες" value={f.maxGuests} onChange={set("maxGuests")} keyboardType="number-pad" error={err.maxGuests} />
        <NumberField label="Βασική τιμή ανά νύχτα (€)" value={f.basePrice} onChange={set("basePrice")} error={err.basePrice} />
      </Card>
      <Card style={{ gap: 14 }}>
        <TextField label="ΑΜΑ (Αριθμός Μητρώου Ακινήτου)" value={f.ama} onChangeText={set("ama")} keyboardType="number-pad" error={err.ama} hint="Από το Μητρώο Βραχυχρόνιας Διαμονής της ΑΑΔΕ" />
        <SelectField label="Τύπος" value={f.kind} onChange={set("kind")}
          options={[{ value: "APARTMENT", label: "Διαμέρισμα" }, { value: "DETACHED_HOUSE", label: "Μονοκατοικία" }]}
          hint="Μονοκατοικίες άνω των 80 m² έχουν υψηλότερο ΤΑΚΚ" />
        <NumberField label="Εμβαδόν (m²)" value={f.areaSqm} onChange={set("areaSqm")} keyboardType="number-pad" error={err.areaSqm} />
        <TextField label="Περιγραφή" value={f.description} onChangeText={set("description")} multiline hint="Εμφανίζεται και στη σελίδα απευθείας κρατήσεων" />
      </Card>
      <Card style={{ gap: 14 }}>
        <TextField label="Check-in από (ΩΩ:ΛΛ)" value={f.checkInTime} onChangeText={set("checkInTime")} error={err.checkInTime} placeholder="15:00" keyboardType="numbers-and-punctuation" />
        <TextField label="Check-out έως (ΩΩ:ΛΛ)" value={f.checkOutTime} onChangeText={set("checkOutTime")} error={err.checkOutTime} placeholder="11:00" keyboardType="numbers-and-punctuation" />
        <TextField label="Κανόνες του σπιτιού" value={f.houseRules} onChangeText={set("houseRules")} multiline error={err.houseRules}
          hint="Τους αποδέχεται ο επισκέπτης στο online check-in και εμφανίζονται στον οδηγό" />
      </Card>
      <Button title={editing ? "Αποθήκευση" : "Δημιουργία ακινήτου"} loading={pending} onPress={save} />
    </Screen>
  );
}
