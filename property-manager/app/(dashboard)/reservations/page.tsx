import { NotebookTabs, Plus } from "lucide-react";
import type { Metadata } from "next";
import { ReservationFormDialog } from "@/components/reservations/reservation-form";
import { ReservationTable } from "@/components/reservations/reservation-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterSelect, SearchInput } from "@/components/ui/filters";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { isISODate } from "@/lib/dates";
import { humanize } from "@/lib/format";
import { getFormOptions } from "@/lib/services/options";
import { listReservations } from "@/lib/services/reservations";
import { reservationListQuery } from "@/lib/validation/reservation";

export const metadata: Metadata = { title: "Κρατήσεις" };

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { ctx } = await getPageContext();
  const sp = await searchParams;
  const parsed = reservationListQuery.safeParse({ q: sp.q, status: sp.status, propertyId: sp.filterProperty });
  const filters = parsed.success ? parsed.data : {};
  const [reservations, options] = await Promise.all([listReservations(ctx, filters), getFormOptions(ctx)]);
  const filtered = Boolean(filters.q || filters.status || filters.propertyId);
  const defaults = {
    propertyId: sp.propertyId,
    checkIn: sp.checkIn && isISODate(sp.checkIn) ? sp.checkIn : undefined,
    checkOut: sp.checkOut && isISODate(sp.checkOut) ? sp.checkOut : undefined,
  };

  return (
    <>
      <PageHeader
        title="Κρατήσεις"
        description={`${reservations.length} ${reservations.length === 1 ? "κράτηση" : "κρατήσεις"}${filtered ? " με τα φίλτρα" : ""}`}
        actions={
          <ReservationFormDialog
            key={sp.new ? `new-${sp.propertyId}-${sp.checkIn}` : "new"}
            properties={options.properties}
            guests={options.guests}
            pricing={options.pricing}
            defaults={defaults}
            defaultOpen={sp.new === "1"}
            trigger={<Button><Plus /> Νέα κράτηση</Button>}
          />
        }
      />
      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <SearchInput placeholder="Επισκέπτης, ακίνητο ή κωδικός κράτησης" />
        <FilterSelect param="status" label="Όλες οι καταστάσεις" options={["CONFIRMED", "PENDING", "COMPLETED", "CANCELLED"].map((s) => ({ value: s, label: humanize(s) }))} />
        <FilterSelect param="filterProperty" label="Όλα τα ακίνητα" options={options.properties.map((p) => ({ value: p.id, label: p.name }))} />
      </div>
      <Card className="overflow-hidden">
        {reservations.length === 0 ? (
          <EmptyState icon={<NotebookTabs />} title={filtered ? "Καμία κράτηση με αυτά τα φίλτρα" : "Δεν υπάρχουν κρατήσεις ακόμη"} description={filtered ? "Δοκιμάστε να αφαιρέσετε ένα φίλτρο." : "Δημιουργήστε την πρώτη σας κράτηση για να εμφανιστεί εδώ και στο ημερολόγιο."} />
        ) : (
          <ReservationTable reservations={reservations} />
        )}
      </Card>
    </>
  );
}
