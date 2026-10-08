import { Stack } from "expo-router";
import { useState } from "react";
import { DateField, NumberField, Segmented, SelectField, TextField } from "@/components/form";
import { Button, Card, Loading, Screen } from "@/components/ui";
import { api } from "@/lib/api";
import { TRANSACTION_CATEGORIES } from "@/lib/constants";
import { humanize, localToday } from "@/lib/format";
import type { Property } from "@/lib/types";
import { goBack, useMutation } from "@/lib/use-mutation";
import { useQuery } from "@/lib/use-query";

export default function NewTransaction() {
  const properties = useQuery<Property[]>("/api/properties");
  const { run, pending, fieldErrors: err } = useMutation();
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [propertyId, setPropertyId] = useState("");
  const [category, setCategory] = useState("CLEANING");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(localToday());
  const [description, setDescription] = useState("");
  if (!properties.data) return <Loading />;
  const pid = propertyId || properties.data[0]?.id || "";

  return (
    <Screen>
      <Stack.Screen options={{ title: "Νέα κίνηση", presentation: "modal" }} />
      <Card style={{ gap: 14 }}>
        <Segmented options={[{ key: "EXPENSE", label: "Έξοδο" }, { key: "INCOME", label: "Έσοδο" }]} value={type} onChange={setType} />
        <SelectField label="Ακίνητο" value={pid} onChange={setPropertyId} options={properties.data.map((p) => ({ value: p.id, label: p.name }))} error={err.propertyId} />
        <SelectField label="Κατηγορία" value={category} onChange={setCategory} options={TRANSACTION_CATEGORIES.map((c) => ({ value: c, label: humanize(c) }))} />
        <NumberField label="Ποσό (€)" value={amount} onChange={setAmount} error={err.amount} />
        <DateField label="Ημερομηνία" value={date} onChange={setDate} error={err.transactionDate} />
        <TextField label="Περιγραφή" value={description} onChangeText={setDescription} placeholder="π.χ. Λογαριασμός ΔΕΗ" />
      </Card>
      <Button title="Αποθήκευση" loading={pending}
        onPress={() => void run(() => api("/api/transactions", { body: { type, propertyId: pid, category, amount: amount === "" ? undefined : Number(amount), transactionDate: date, description, currency: "EUR" } }), { onSuccess: () => goBack("/financials") })} />
    </Screen>
  );
}
