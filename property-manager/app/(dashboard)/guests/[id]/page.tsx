import { Mail, Pencil, Phone } from "lucide-react";
import type { Metadata } from "next";
import { GuestFormDialog } from "@/components/guests/guest-form";
import { GuestNotes } from "@/components/guests/guest-notes";
import { MessageComposer } from "@/components/guests/message-composer";
import { MessageList } from "@/components/guests/message-list";
import { ReservationTable } from "@/components/reservations/reservation-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DefinitionList, EmptyState, PageHeader, Stat } from "@/components/ui/misc";
import { getPageContext, orNotFound } from "@/lib/auth/page";
import { formatMoney } from "@/lib/format";
import { getGuestDetails } from "@/lib/services/guests";

export const metadata: Metadata = { title: "Guest" };

export default async function GuestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx } = await getPageContext();
  const { guest: g, reservations, messages, stats } = await orNotFound(getGuestDetails(ctx, id));
  return (
    <>
      <PageHeader
        back={{ href: "/guests", label: "Guests" }}
        title={g.fullName}
        description={g.country ?? undefined}
        actions={
          <>
            {g.email && <Button asChild variant="outline"><a href={`mailto:${g.email}`}><Mail /> Email</a></Button>}
            {g.phone && <Button asChild variant="outline"><a href={`tel:${g.phone}`}><Phone /> Call</a></Button>}
            <GuestFormDialog guest={g} trigger={<Button variant="outline"><Pencil /> Edit</Button>} />
          </>
        }
      />
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Stat label="Stays" value={stats.stays} />
        <Stat label="Total revenue" value={formatMoney(stats.totalRevenue, stats.currency)} />
        <Stat label="Average stay" value={`${stats.averageStay} nights`} />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid min-w-0 content-start gap-6">
          <Card>
            <CardHeader title="Reservation history" />
            {reservations.length ? <ReservationTable reservations={reservations} hideGuest /> : <EmptyState title="No reservations yet" />}
          </Card>
          <Card>
            <CardHeader title="Messages" />
            <CardContent className="grid gap-4">
              <MessageComposer guestId={g.id} />
              <MessageList messages={messages} />
            </CardContent>
          </Card>
        </div>
        <div className="grid min-w-0 content-start gap-6">
          <Card>
            <CardHeader title="Contact" />
            <CardContent>
              <DefinitionList items={[{ label: "Email", value: g.email }, { label: "Phone", value: g.phone }, { label: "Country", value: g.country }, { label: "Guest since", value: g.createdAt.slice(0, 10) }]} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Notes" />
            <CardContent>
              <GuestNotes guestId={g.id} notes={g.notes} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
