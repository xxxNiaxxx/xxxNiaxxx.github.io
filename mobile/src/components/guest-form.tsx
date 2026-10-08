import { router } from "expo-router";
import { useState } from "react";
import { SelectField, TextField } from "@/components/form";
import { Button, Card, Screen } from "@/components/ui";
import { GUEST_ID_TYPE_KEYS, GUEST_ID_TYPES } from "@/lib/aade";
import { api } from "@/lib/api";
import { GUEST_LANGUAGES } from "@/lib/constants";
import type { Guest } from "@/lib/types";
import { goBack, useMutation } from "@/lib/use-mutation";

export function GuestForm({ guest }: { guest?: Guest }) {
  const editing = Boolean(guest);
  const { run, pending, fieldErrors: err } = useMutation();
  const [f, setF] = useState({
    firstName: guest?.firstName ?? "",
    lastName: guest?.lastName ?? "",
    email: guest?.email ?? "",
    phone: guest?.phone ?? "",
    country: guest?.country ?? "",
    language: guest?.languagePreference ?? "",
    notes: guest?.notes ?? "",
    idType: guest?.idType ?? "",
    idNumber: guest?.idNumber ?? "",
  });
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  async function save() {
    await run(() => api<Guest>(editing ? `/api/guests/${guest!.id}` : "/api/guests", { method: editing ? "PATCH" : "POST", body: f }), {
      onSuccess: (g) => (editing ? goBack(`/guest/${g.id}`) : router.replace(`/guest/${g.id}`)),
    });
  }

  return (
    <Screen>
      <Card style={{ gap: 14 }}>
        <TextField label="Όνομα" value={f.firstName} onChangeText={set("firstName")} error={err.firstName} />
        <TextField label="Επώνυμο" value={f.lastName} onChangeText={set("lastName")} error={err.lastName} />
        <TextField label="Email" value={f.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" error={err.email} />
        <TextField label="Τηλέφωνο" value={f.phone} onChangeText={set("phone")} keyboardType="phone-pad" error={err.phone} />
        <TextField label="Χώρα" value={f.country} onChangeText={set("country")} error={err.country} />
        <SelectField label="Γλώσσα μηνυμάτων" value={f.language} onChange={set("language")}
          options={[{ value: "", label: "Αυτόματα (από τη χώρα)" }, ...GUEST_LANGUAGES.map((l) => ({ value: l.code, label: l.name }))]} />
        <SelectField label="Τύπος ταυτοποίησης (ΑΑΔΕ)" value={f.idType} onChange={set("idType")}
          options={[{ value: "", label: "—" }, ...GUEST_ID_TYPE_KEYS.map((k) => ({ value: k, label: GUEST_ID_TYPES[k] }))]} />
        <TextField label="Αριθμός ταυτότητας / διαβατηρίου / ΑΦΜ" value={f.idNumber} onChangeText={set("idNumber")} autoCapitalize="characters" error={err.idNumber} />
        <TextField label="Σημειώσεις" value={f.notes} onChangeText={set("notes")} multiline />
      </Card>
      <Button title={editing ? "Αποθήκευση" : "Δημιουργία επισκέπτη"} loading={pending} onPress={save} />
    </Screen>
  );
}
