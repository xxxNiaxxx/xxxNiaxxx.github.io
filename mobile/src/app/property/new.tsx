import { Stack } from "expo-router";
import { PropertyForm } from "@/components/property-form";

export default function NewProperty() {
  return (
    <>
      <Stack.Screen options={{ title: "Νέο ακίνητο", presentation: "modal" }} />
      <PropertyForm />
    </>
  );
}
