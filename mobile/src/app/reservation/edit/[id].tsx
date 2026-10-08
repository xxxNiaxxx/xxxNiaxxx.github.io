import { Stack, useLocalSearchParams } from "expo-router";
import { ReservationForm } from "@/components/reservation-form";
import { ErrorBox, Loading, Screen } from "@/components/ui";
import type { Reservation } from "@/lib/types";
import { useQuery } from "@/lib/use-query";

export default function EditReservation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, reload } = useQuery<{ reservation: Reservation }>(`/api/reservations/${id}`);
  return (
    <>
      <Stack.Screen options={{ title: "Επεξεργασία κράτησης" }} />
      {data ? <ReservationForm reservation={data.reservation} /> : error ? <Screen><ErrorBox message={error} onRetry={reload} /></Screen> : <Loading />}
    </>
  );
}
