import { ClipboardList, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MessageComposer } from "@/components/guests/message-composer";
import { MessageList } from "@/components/guests/message-list";
import { CancelReservationButton } from "@/components/reservations/cancel-button";
import { ReservationFormDialog } from "@/components/reservations/reservation-form";
import { TaskListCompact } from "@/components/tasks/task-list-compact";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DefinitionList, EmptyState, PageHeader } from "@/components/ui/misc";
import { SOURCE_LABELS, StatusBadge } from "@/components/ui/status";
import { getPageContext, orNotFound } from "@/lib/auth/page";
import { formatDay, formatMoney } from "@/lib/format";
import { getFormOptions } from "@/lib/services/options";
import { getReservationDetails } from "@/lib/services/reservations";
import { getStayTax } from "@/lib/services/tax";
import { DeclareButton } from "@/components/tax/actions";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Reservation" };

export default async function ReservationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx } = await getPageContext();
  const [{ reservation: r, tasks, messages }, options, tax] = await Promise.all([
    orNotFound(getReservationDetails(ctx, id)),
    getFormOptions(ctx),
    orNotFound(getStayTax(ctx, id)),
  ]);
  const open = r.status === "CONFIRMED" || r.status === "PENDING";

  return (
    <>
      <PageHeader
        back={{ href: "/reservations", label: "Reservations" }}
        title={<span className="flex flex-wrap items-center gap-3">{r.guestName} <StatusBadge value={r.status} /></span>}
        description={`${r.propertyName} · ${formatDay(r.checkIn)} → ${formatDay(r.checkOut)} · ${r.nights} nights`}
        actions={
          <>
            {open && <CancelReservationButton id={r.id} />}
            <ReservationFormDialog properties={options.properties} guests={options.guests} reservation={r} trigger={<Button variant="outline"><Pencil /> Edit</Button>} />
          </>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid min-w-0 content-start gap-6">
          <Card>
            <CardHeader title="Stay" />
            <CardContent>
              <DefinitionList
                items={[
                  { label: "Property", value: <Link className="hover:underline" href={`/properties/${r.propertyId}`}>{r.propertyName}</Link> },
                  { label: "Guest", value: <Link className="hover:underline" href={`/guests/${r.guestId}`}>{r.guestName}</Link> },
                  { label: "Check-in", value: formatDay(r.checkIn, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) },
                  { label: "Check-out", value: formatDay(r.checkOut, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) },
                  { label: "Guests", value: r.guestsCount },
                  { label: "Total", value: formatMoney(r.totalAmount, r.currency) },
                  { label: "Source", value: SOURCE_LABELS[r.source] },
                  { label: "Confirmation code", value: r.confirmationCode ?? <span className="text-warning">Missing</span> },
                ]}
              />
              {r.notes && <p className="mt-4 rounded-lg bg-muted/60 p-3 text-sm">{r.notes}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Guest messages" description="Check-in instructions and other communication" />
            <CardContent className="grid gap-4">
              {open && <MessageComposer guestId={r.guestId} reservationId={r.id} />}
              <MessageList messages={messages} />
            </CardContent>
          </Card>
        </div>
        <div className="grid min-w-0 content-start gap-6">
          <Card>
            <CardHeader title="Tax & AADE" description={tax.ama ? `AMA ${tax.ama}` : "Property has no AMA"} />
            <CardContent className="grid gap-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Climate fee (ΤΑΚΚ)</span><span className="font-medium tabular-nums">{formatMoney(tax.climateFee)}</span></div>
              {tax.regime === "BUSINESS" && (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Rent ex VAT</span><span className="tabular-nums">{formatMoney(tax.rent)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">VAT 13% · presence fee 0.5%</span><span className="tabular-nums">{formatMoney(tax.vat)} · {formatMoney(tax.presenceFee)}</span></div>
                </>
              )}
              {tax.longStay ? (
                <p className="text-[13px] text-muted-foreground">60+ nights: not a short-term rental — declare it as a regular lease.</p>
              ) : tax.declaration.required ? (
                <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                  <div>
                    <div className="text-[13px] text-muted-foreground">Stay declaration</div>
                    {tax.declaration.status === "DECLARED" ? (
                      <Badge tone="success">Declared</Badge>
                    ) : (
                      <Badge tone={tax.declaration.overdue ? "danger" : "neutral"}>
                        {tax.declaration.overdue ? "Overdue · " : "Due "}{formatDay(tax.declaration.deadline, { day: "numeric", month: "short", year: "numeric" })}
                      </Badge>
                    )}
                  </div>
                  {tax.declaration.triggerDate <= new Date().toISOString().slice(0, 10) && <DeclareButton reservationId={r.id} declared={tax.declaration.status === "DECLARED"} />}
                </div>
              ) : (
                <p className="text-[13px] text-muted-foreground">No stay declaration needed.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Contact" />
            <CardContent>
              <DefinitionList items={[{ label: "Email", value: r.guestEmail }, { label: "Phone", value: r.guestPhone }]} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader
              title="Tasks"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/tasks?new=1&propertyId=${r.propertyId}&reservationId=${r.id}`}><ClipboardList /> Add</Link>
                </Button>
              }
            />
            {tasks.length ? <TaskListCompact tasks={tasks} showProperty={false} /> : <EmptyState title="No tasks for this stay" description="Add a cleaning or check-in task." />}
          </Card>
        </div>
      </div>
    </>
  );
}
