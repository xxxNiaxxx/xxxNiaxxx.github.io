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
import { getFormOptions } from "@/lib/services/options";
import { listReservations } from "@/lib/services/reservations";
import { reservationListQuery } from "@/lib/validation/reservation";

export const metadata: Metadata = { title: "Reservations" };

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
        title="Reservations"
        description={`${reservations.length} reservation${reservations.length === 1 ? "" : "s"}${filtered ? " matching filters" : ""}`}
        actions={
          <ReservationFormDialog
            key={sp.new ? `new-${sp.propertyId}-${sp.checkIn}` : "new"}
            properties={options.properties}
            guests={options.guests}
            defaults={defaults}
            defaultOpen={sp.new === "1"}
            trigger={<Button><Plus /> New reservation</Button>}
          />
        }
      />
      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <SearchInput placeholder="Guest, property or confirmation code" />
        <FilterSelect param="status" label="All statuses" options={["CONFIRMED", "PENDING", "COMPLETED", "CANCELLED"].map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))} />
        <FilterSelect param="filterProperty" label="All properties" options={options.properties.map((p) => ({ value: p.id, label: p.name }))} />
      </div>
      <Card className="overflow-hidden">
        {reservations.length === 0 ? (
          <EmptyState icon={<NotebookTabs />} title={filtered ? "No reservations match these filters" : "No reservations yet"} description={filtered ? "Try clearing a filter." : "Create your first booking to see it here and on the calendar."} />
        ) : (
          <ReservationTable reservations={reservations} />
        )}
      </Card>
    </>
  );
}
