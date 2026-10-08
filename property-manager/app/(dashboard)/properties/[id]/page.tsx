import { CalendarPlus, ClipboardList, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PropertyFormDialog } from "@/components/properties/property-form";
import { PropertyStatusToggle } from "@/components/properties/property-status-toggle";
import { ReservationTable } from "@/components/reservations/reservation-table";
import { TaskListCompact } from "@/components/tasks/task-list-compact";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DefinitionList, EmptyState, PageHeader, Stat } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status";
import { getPageContext, orNotFound } from "@/lib/auth/page";
import { formatDay, formatMoney, formatPercent } from "@/lib/format";
import { getPropertyDetails } from "@/lib/services/properties";

export const metadata: Metadata = { title: "Property" };

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx } = await getPageContext();
  const d = await orNotFound(getPropertyDetails(ctx, id));
  const p = d.property;
  const cur = d.currentReservation;

  return (
    <>
      <PageHeader
        back={{ href: "/properties", label: "Properties" }}
        title={<span className="flex items-center gap-3">{p.name} <StatusBadge value={p.status} /></span>}
        description={[p.address, p.city, p.country].filter(Boolean).join(", ")}
        actions={
          <>
            <PropertyStatusToggle id={p.id} status={p.status} />
            <PropertyFormDialog property={p} trigger={<Button variant="outline"><Pencil /> Edit</Button>} />
            {p.status === "ACTIVE" && (
              <Button asChild>
                <Link href={`/reservations?new=1&propertyId=${p.id}`}><CalendarPlus /> New reservation</Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Revenue" value={formatMoney(d.month.income, p.currency)} hint="this month" />
        <Stat label="Net" value={formatMoney(d.month.net, p.currency)} hint={`after ${formatMoney(d.month.expenses, p.currency)} expenses`} />
        <Stat label="Occupancy" value={formatPercent(d.month.occupancy)} hint={`${d.month.bookedNights} nights booked this month`} />
        <Stat label="Base price" value={formatMoney(p.basePrice, p.currency)} hint="per night" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid min-w-0 content-start gap-6">
          <Card>
            <CardHeader title="Current stay" />
            <CardContent>
              {cur ? (
                <Link href={`/reservations/${cur.id}`} className="flex items-center justify-between rounded-xl border border-border p-4 hover:bg-muted/40">
                  <div>
                    <div className="font-medium">{cur.guestName}</div>
                    <div className="text-[13px] text-muted-foreground">
                      {formatDay(cur.checkIn)} → {formatDay(cur.checkOut)} · {cur.guestsCount} guests
                    </div>
                  </div>
                  <StatusBadge value={cur.status} label="In house" />
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">Vacant tonight.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Upcoming reservations" description="Next 10 arrivals" />
            {d.upcomingReservations.length ? (
              <ReservationTable reservations={d.upcomingReservations} hideProperty />
            ) : (
              <EmptyState title="No upcoming reservations" />
            )}
          </Card>
        </div>
        <div className="grid min-w-0 content-start gap-6">
          <Card>
            <CardHeader title="Details" />
            <CardContent>
              <DefinitionList
                items={[
                  { label: "Bedrooms", value: p.bedrooms },
                  { label: "Bathrooms", value: p.bathrooms },
                  { label: "Max guests", value: p.maxGuests },
                  { label: "Currency", value: p.currency },
                ]}
              />
              {p.description && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{p.description}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader
              title="Open tasks"
              action={<Button asChild variant="ghost" size="sm"><Link href={`/tasks?new=1&propertyId=${p.id}`}><ClipboardList /> Add</Link></Button>}
            />
            {d.openTasks.length ? <TaskListCompact tasks={d.openTasks} showProperty={false} /> : <EmptyState title="No open tasks" />}
          </Card>
        </div>
      </div>
    </>
  );
}
