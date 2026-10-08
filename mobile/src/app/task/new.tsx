import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { DateField, SelectField, TextField } from "@/components/form";
import { Button, Card, Loading, Screen } from "@/components/ui";
import { api } from "@/lib/api";
import { PRIORITIES, TASK_TITLE_PRESETS, TASK_TYPES, type TaskType } from "@/lib/constants";
import { humanize } from "@/lib/format";
import type { Member, Property } from "@/lib/types";
import { goBack, useMutation } from "@/lib/use-mutation";
import { useQuery } from "@/lib/use-query";

const CUSTOM = "__custom";
const TIMES = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

export default function NewTask() {
  const params = useLocalSearchParams<{ propertyId?: string; reservationId?: string }>();
  const properties = useQuery<Property[]>("/api/properties");
  const members = useQuery<Member[]>("/api/members");
  const { run, pending, fieldErrors: err } = useMutation();
  const [preset, setPreset] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [type, setType] = useState<TaskType>("CLEANING");
  const [propertyId, setPropertyId] = useState(params.propertyId ?? "");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("11:00");
  const [priority, setPriority] = useState("MEDIUM");
  const [assignee, setAssignee] = useState("");
  const [description, setDescription] = useState("");
  if (!properties.data || !members.data) return <Loading />;
  const pid = propertyId || properties.data.find((p) => p.status === "ACTIVE")?.id || "";

  function choose(v: string) {
    setPreset(v);
    const match = TASK_TYPES.find((t) => TASK_TITLE_PRESETS[t].includes(v));
    if (match) setType(match);
  }

  async function save() {
    // The due time is local to the phone, like in the web app's browser.
    const dueAt = dueDate ? new Date(`${dueDate}T${dueTime}:00`).toISOString() : null;
    await run(
      () => api("/api/tasks", {
        body: { title: preset === CUSTOM ? customTitle : preset, propertyId: pid, type, priority, dueAt, assignedToUserId: assignee || null, description, reservationId: params.reservationId ?? null },
      }),
      { onSuccess: () => goBack("/tasks") },
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Νέα εργασία", presentation: "modal" }} />
      <Card style={{ gap: 14 }}>
        <SelectField label="Τίτλος" value={preset} onChange={choose} placeholder="Επιλέξτε εργασία…" error={err.title}
          options={[...TASK_TYPES.flatMap((t) => TASK_TITLE_PRESETS[t].map((title) => ({ value: title, label: title, group: humanize(t) }))), { value: CUSTOM, label: "Άλλος τίτλος…", group: "Άλλο" }]} />
        {preset === CUSTOM && <TextField label="Τίτλος εργασίας" value={customTitle} onChangeText={setCustomTitle} autoFocus error={err.title} />}
        <SelectField label="Ακίνητο" value={pid} onChange={setPropertyId} options={properties.data.map((p) => ({ value: p.id, label: p.name }))} error={err.propertyId} />
        <SelectField label="Τύπος" value={type} onChange={(v) => setType(v as TaskType)} options={TASK_TYPES.map((t) => ({ value: t, label: humanize(t) }))} />
      </Card>
      <Card style={{ gap: 14 }}>
        <DateField label="Προθεσμία" value={dueDate} onChange={setDueDate} clearable error={err.dueAt} />
        {dueDate ? <SelectField label="Ώρα" value={dueTime} onChange={setDueTime} options={TIMES.map((t) => ({ value: t, label: t }))} /> : null}
        <SelectField label="Προτεραιότητα" value={priority} onChange={setPriority} options={PRIORITIES.map((p) => ({ value: p, label: humanize(p) }))} />
        <SelectField label="Ανάθεση σε" value={assignee} onChange={setAssignee} options={[{ value: "", label: "Χωρίς ανάθεση" }, ...members.data.map((m) => ({ value: m.userId, label: m.name }))]} />
        <TextField label="Περιγραφή" value={description} onChangeText={setDescription} multiline />
      </Card>
      <Button title="Δημιουργία εργασίας" loading={pending} disabled={!preset || (preset === CUSTOM && !customTitle.trim())} onPress={save} />
    </Screen>
  );
}
