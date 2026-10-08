import { Stack, useLocalSearchParams } from "expo-router";
import { GuestForm } from "@/components/guest-form";
import { ErrorBox, Loading, Screen } from "@/components/ui";
import type { GuestDetails } from "@/lib/types";
import { useQuery } from "@/lib/use-query";

export default function EditGuest() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, reload } = useQuery<GuestDetails>(`/api/guests/${id}`);
  return (
    <>
      <Stack.Screen options={{ title: "Επεξεργασία επισκέπτη" }} />
      {data ? <GuestForm guest={data.guest} /> : error ? <Screen><ErrorBox message={error} onRetry={reload} /></Screen> : <Loading />}
    </>
  );
}
