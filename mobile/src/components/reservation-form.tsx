import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { CheckRow, DateField, NumberField, Segmented, SelectField, TextField } from "@/components/form";
import { Button, Card, Loading, Screen, styles } from "@/components/ui";
import { api } from "@/lib/api";
import { RESERVATION_SOURCES } from "@/lib/constants";
import { addDays, formatMoney, humanize } from "@/lib/format";
import type { Guest, Property, Reservation } from "@/lib/types";
import { goBack, useMutation } from "@/lib/use-mutation";
import { useQuery } from "@/lib/use-query";

const nightsBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

export function ReservationForm({ reservation, defaults }: { reservation?: Reservation; defaults?: { propertyId?: string; guestId?: string; checkIn?: string } }) {
  const editing = Boolean(reservation);
  const properties = useQuery<Property[]>("/api/properties");
  const guests = useQuery<Guest[]>("/api/guests");
  const { run, pending, fieldErrors: err } = useMutation();

  const [propertyId, setPropertyId] = useState(reservation?.propertyId ?? defaults?.propertyId ?? "");
  const [guestMode, setGuestMode] = useState<"existing" | "new">("existing");
  const [guestId, setGuestId] = useState(reservation?.guestId ?? defaults?.guestId ?? "");
  const [newGuest, setNewGuest] = useState({ firstName: "", lastName: "", email: "", phone: "", country: "" });
  const [checkIn, setCheckIn] = useState(reservation?.checkIn ?? defaults?.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(reservation?.checkOut ?? "");
  const [guestsCount, setGuestsCount] = useState(String(reservation?.guestsCount ?? 2));
  const [free, setFree] = useState(reservation?.complimentary ?? false);
  const [amount, setAmount] = useState(reservation ? String(reservation.totalAmount) : "");
  const [source, setSource] = useState(reservation?.source ?? "MANUAL");
  const [code, setCode] = useState(reservation?.confirmationCode ?? "");
  const [status, setStatus] = useState<string>(reservation?.status ?? "CONFIRMED");
  const [notes, setNotes] = useState(reservation?.notes ?? "");

  if (!properties.data || !guests.data) return <Loading />;
  const active = properties.data.filter((p) => p.status === "ACTIVE" || p.id === reservation?.propertyId);
  const property = properties.data.find((p) => p.id === (propertyId || active[0]?.id));
  const nights = checkIn && checkOut && checkOut > checkIn ? nightsBetween(checkIn, checkOut) : 0;
  const suggested = property && nights ? property.basePrice * nights : null;
  const dateError = checkIn && checkOut && checkOut <= checkIn ? "Η αναχώρηση πρέπει να είναι μετά την άφιξη" : undefined;

  async function save() {
    const body: Record<string, unknown> = {
      propertyId: property?.id,
      checkIn,
      checkOut,
      guestsCount: Number(guestsCount) || 0,
      totalAmount: free ? 0 : amount === "" ? undefined : Number(amount),
      complimentary: free,
      currency: property?.currency ?? "EUR",
      source,
      confirmationCode: code,
      status,
      notes,
    };
    if (editing) body.guestId = guestId;
    else if (guestMode === "new") body.newGuest = newGuest;
    else body.guestId = guestId || undefined;
    await run(
      () => api<Reservation>(editing ? `/api/reservations/${reservation!.id}` : "/api/reservations", { method: editing ? "PATCH" : "POST", body }),
      { onSuccess: (r) => (editing ? goBack(`/reservation/${r.id}`) : router.replace(`/reservation/${r.id}`)) },
    );
  }

  return (
    <Screen>
      <Card style={{ gap: 14 }}>
        <SelectField label="Ακίνητο" value={property?.id ?? ""} onChange={setPropertyId} error={err.propertyId}
          options={active.map((p) => ({ value: p.id, label: p.name, detail: `έως ${p.maxGuests} άτομα · ${formatMoney(p.basePrice, p.currency)}/νύχτα` }))} />
        {!editing && (
          <Segmented options={[{ key: "existing", label: "Υπάρχων επισκέπτης" }, { key: "new", label: "Νέος επισκέπτης" }]} value={guestMode} onChange={setGuestMode} />
        )}
        {editing || guestMode === "existing" ? (
          <SelectField label="Επισκέπτης" value={guestId} onChange={setGuestId} error={err.guestId}
            options={guests.data.map((g) => ({ value: g.id, label: g.fullName, detail: g.email ?? g.phone ?? undefined }))} />
        ) : (
          <View style={{ gap: 12 }}>
            <TextField label="Όνομα" value={newGuest.firstName} onChangeText={(v) => setNewGuest({ ...newGuest, firstName: v })} error={err.newGuest} />
            <TextField label="Επώνυμο" value={newGuest.lastName} onChangeText={(v) => setNewGuest({ ...newGuest, lastName: v })} />
            <TextField label="Email" value={newGuest.email} onChangeText={(v) => setNewGuest({ ...newGuest, email: v })} keyboardType="email-address" autoCapitalize="none" />
            <TextField label="Τηλέφωνο" value={newGuest.phone} onChangeText={(v) => setNewGuest({ ...newGuest, phone: v })} keyboardType="phone-pad" />
            <TextField label="Χώρα" value={newGuest.country} onChangeText={(v) => setNewGuest({ ...newGuest, country: v })} hint="Από τη χώρα επιλέγεται η γλώσσα των μηνυμάτων" />
          </View>
        )}
      </Card>

      <Card style={{ gap: 14 }}>
        <DateField label="Άφιξη" value={checkIn} onChange={(v) => { setCheckIn(v); if (!checkOut || checkOut <= v) setCheckOut(addDays(v, 1)); }} error={err.checkIn} />
        <DateField label="Αναχώρηση" value={checkOut} min={checkIn ? addDays(checkIn, 1) : undefined} onChange={setCheckOut} error={dateError ?? err.checkOut} />
        <NumberField label="Άτομα" value={guestsCount} onChange={setGuestsCount} keyboardType="number-pad" error={err.guestsCount} hint={property ? `Έως ${property.maxGuests}` : undefined} />
      </Card>

      <Card style={{ gap: 14 }}>
        <CheckRow label="Δωρεάν φιλοξενία" detail="Συγγενείς ή φίλοι χωρίς καμία πληρωμή. Χωρίς έσοδο, ΤΑΚΚ και δήλωση στην ΑΑΔΕ." value={free} onChange={setFree} />
        {free ? (
          <Text style={styles.rowSub}>Ποσό: χωρίς ενοίκιο</Text>
        ) : (
          <NumberField label="Συνολικό ποσό (€)" value={amount} onChange={setAmount} error={err.totalAmount} placeholder={suggested ? String(suggested) : undefined}
            hint={suggested ? `Πρόταση ${formatMoney(suggested)} (${nights} × βασική τιμή)` : undefined} />
        )}
        {suggested && !free && amount === "" && <Button small variant="outline" title={`Χρήση ${formatMoney(suggested)}`} onPress={() => setAmount(String(suggested))} style={{ alignSelf: "flex-start" }} />}
        <SelectField label="Πηγή" value={source} onChange={setSource} options={RESERVATION_SOURCES.map((s) => ({ value: s, label: humanize(s) }))} />
        <TextField label="Κωδικός κράτησης" value={code} onChangeText={setCode} placeholder="Προαιρετικό" error={err.confirmationCode} />
        <SelectField label="Κατάσταση" value={status} onChange={setStatus}
          options={["CONFIRMED", "PENDING", ...(editing ? ["COMPLETED", "CANCELLED"] : [])].map((s) => ({ value: s, label: humanize(s) }))} />
        <TextField label="Σημειώσεις" value={notes} onChangeText={setNotes} multiline />
      </Card>

      <Button title={editing ? "Αποθήκευση" : "Αποθήκευση κράτησης"} loading={pending} disabled={!!dateError} onPress={save} />
    </Screen>
  );
}
