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
import { ComplianceChecklist } from "@/components/tax/compliance-card";

export const metadata: Metadata = { title: "Ακίνητο" };

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx } = await getPageContext();
  const d = await orNotFound(getPropertyDetails(ctx, id));
  const p = d.property;
  const cur = d.currentReservation;

  return (
    <>
      <PageHeader
        back={{ href: "/properties", label: "Ακίνητα" }}
        title={<span className="flex items-center gap-3">{p.name} <StatusBadge value={p.status} /></span>}
        description={[p.address, p.city, p.country].filter(Boolean).join(", ")}
        actions={
          <>
            <PropertyStatusToggle id={p.id} status={p.status} />
            <PropertyFormDialog property={p} trigger={<Button variant="outline"><Pencil /> Επεξεργασία</Button>} />
            {p.status === "ACTIVE" && (
              <Button asChild>
                <Link href={`/reservations?new=1&propertyId=${p.id}`}><CalendarPlus /> Νέα κράτηση</Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Έσοδα" value={formatMoney(d.month.income, p.currency)} hint="αυτόν τον μήνα" />
        <Stat label="Καθαρά" value={formatMoney(d.month.net, p.currency)} hint={`μετά από ${formatMoney(d.month.expenses, p.currency)} έξοδα`} />
        <Stat label="Πληρότητα" value={formatPercent(d.month.occupancy)} hint={`${d.month.bookedNights} νύχτες κλεισμένες αυτόν τον μήνα`} />
        <Stat label="Βασική τιμή" value={formatMoney(p.basePrice, p.currency)} hint="ανά νύχτα" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid min-w-0 content-start gap-6">
          <Card>
            <CardHeader title="Τρέχουσα διαμονή" />
            <CardContent>
              {cur ? (
                <Link href={`/reservations/${cur.id}`} className="flex items-center justify-between rounded-xl border border-border p-4 hover:bg-muted/40">
                  <div>
                    <div className="font-medium">{cur.guestName}</div>
                    <div className="text-[13px] text-muted-foreground">
                      {formatDay(cur.checkIn)} → {formatDay(cur.checkOut)} · {cur.guestsCount} άτομα
                    </div>
                  </div>
                  <StatusBadge value={cur.status} label="Φιλοξενείται" />
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">Ελεύθερο απόψε.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Επόμενες κρατήσεις" description="Οι επόμενες 10 αφίξεις" />
            {d.upcomingReservations.length ? (
              <ReservationTable reservations={d.upcomingReservations} hideProperty />
            ) : (
              <EmptyState title="Δεν υπάρχουν επόμενες κρατήσεις" />
            )}
          </Card>
        </div>
        <div className="grid min-w-0 content-start gap-6">
          <Card>
            <CardHeader title="Στοιχεία" />
            <CardContent>
              <DefinitionList
                items={[
                  { label: "Υπνοδωμάτια", value: p.bedrooms },
                  { label: "Μπάνια", value: p.bathrooms },
                  { label: "Μέγιστα άτομα", value: p.maxGuests },
                  { label: "Νόμισμα", value: p.currency },
                  { label: "ΑΜΑ", value: p.ama ?? <span className="text-danger">Λείπει</span> },
                  { label: "Τύπος", value: `${p.kind === "DETACHED_HOUSE" ? "Μονοκατοικία" : "Διαμέρισμα"}${p.areaSqm ? ` · ${p.areaSqm} m²` : ""}` },
                ]}
              />
              {p.description && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{p.description}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Συμμόρφωση" description="Ασφάλεια & ασφάλιση (υποχρεωτικά από 1/10/2025)" />
            <CardContent>
              <ComplianceChecklist propertyId={p.id} compliance={p.compliance} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader
              title="Ανοιχτές εργασίες"
              action={<Button asChild variant="ghost" size="sm"><Link href={`/tasks?new=1&propertyId=${p.id}`}><ClipboardList /> Προσθήκη</Link></Button>}
            />
            {d.openTasks.length ? <TaskListCompact tasks={d.openTasks} showProperty={false} /> : <EmptyState title="Δεν υπάρχουν ανοιχτές εργασίες" />}
          </Card>
        </div>
      </div>
    </>
  );
}
