import { Stack } from "expo-router";
import { GuestForm } from "@/components/guest-form";

export default function NewGuest() {
  return (
    <>
      <Stack.Screen options={{ title: "Νέος επισκέπτης", presentation: "modal" }} />
      <GuestForm />
    </>
  );
}
