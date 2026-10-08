import { Stack, useLocalSearchParams } from "expo-router";
import { PropertyForm } from "@/components/property-form";
import { ErrorBox, Loading, Screen } from "@/components/ui";
import type { PropertyDetails } from "@/lib/types";
import { useQuery } from "@/lib/use-query";

export default function EditProperty() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, reload } = useQuery<PropertyDetails>(`/api/properties/${id}`);
  return (
    <>
      <Stack.Screen options={{ title: "Επεξεργασία ακινήτου" }} />
      {data ? <PropertyForm property={data.property} /> : error ? <Screen><ErrorBox message={error} onRetry={reload} /></Screen> : <Loading />}
    </>
  );
}
