import { Stack, useLocalSearchParams } from "expo-router";
import { ReservationForm } from "@/components/reservation-form";

export default function NewReservation() {
  const params = useLocalSearchParams<{ propertyId?: string; guestId?: string; checkIn?: string }>();
  return (
    <>
      <Stack.Screen options={{ title: "Νέα κράτηση", presentation: "modal" }} />
      <ReservationForm defaults={params} />
    </>
  );
}
