import { ClipboardList, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MessageComposer } from "@/components/guests/message-composer";
import { MessageList } from "@/components/guests/message-list";
import { CancelReservationButton } from "@/components/reservations/cancel-button";
import { PriceBreakdown } from "@/components/reservations/price-breakdown";
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
import { getGuest } from "@/lib/services/guests";
import { languageName } from "@/lib/i18n/guest-language";
import { DeclareButton } from "@/components/tax/actions";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Κράτηση" };

export default async function ReservationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx } = await getPageContext();
  const [{ reservation: r, tasks, messages, platform }, options, tax] = await Promise.all([
    orNotFound(getReservationDetails(ctx, id)),
    getFormOptions(ctx),
    orNotFound(getStayTax(ctx, id)),
  ]);
  const open = r.status === "CONFIRMED" || r.status === "PENDING";
  const guest = await getGuest(ctx, r.guestId);

  return (
    <>
      <PageHeader
        back={{ href: "/reservations", label: "Κρατήσεις" }}
        title={<span className="flex flex-wrap items-center gap-3">{r.guestName} <StatusBadge value={r.status} /></span>}
        description={`${r.propertyName} · ${formatDay(r.checkIn)} → ${formatDay(r.checkOut)} · ${r.nights} νύχτες`}
        actions={
          <>
            {open && <CancelReservationButton id={r.id} />}
            <ReservationFormDialog properties={options.properties} guests={options.guests} pricing={options.pricing} reservation={r} trigger={<Button variant="outline"><Pencil /> Επεξεργασία</Button>} />
          </>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 grid-cols-1 content-start gap-6">
          <Card>
            <CardHeader title="Διαμονή" />
            <CardContent>
              <DefinitionList
                items={[
                  { label: "Ακίνητο", value: <Link className="hover:underline" href={`/properties/${r.propertyId}`}>{r.propertyName}</Link> },
                  { label: "Επισκέπτης", value: <Link className="hover:underline" href={`/guests/${r.guestId}`}>{r.guestName}</Link> },
                  { label: "Άφιξη", value: formatDay(r.checkIn, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) },
                  { label: "Αναχώρηση", value: formatDay(r.checkOut, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) },
                  { label: "Άτομα", value: r.guestsCount },
                  { label: "Τιμή δωματίου", value: r.complimentary ? "Δωρεάν φιλοξενία" : r.fromCalendar && r.totalAmount === 0 ? <span className="text-warning">Λείπει — από το ημερολόγιο {SOURCE_LABELS[r.source]}</span> : formatMoney(r.totalAmount, r.currency) },
                  { label: "Πηγή", value: SOURCE_LABELS[r.source] },
                  { label: "Κωδικός κράτησης", value: r.confirmationCode ?? <span className="text-warning">Λείπει</span> },
                ]}
              />
              {r.notes && <p className="mt-4 rounded-lg bg-muted/60 p-3 text-sm">{r.notes}</p>}
            </CardContent>
          </Card>
          {platform && (
            <Card>
              <CardHeader
                title={`Στοιχεία από ${SOURCE_LABELS[platform.source ?? r.source] ?? "την πλατφόρμα"}`}
                description={platform.importedAt ? `Από το αρχείο κρατήσεων · εισαγωγή ${formatDay(platform.importedAt.slice(0, 10), { day: "numeric", month: "short", year: "numeric" })}` : undefined}
              />
              <CardContent>
                <DefinitionList items={platform.fields.map((f) => ({ label: f.label, value: <span className="whitespace-pre-line break-words">{f.value}</span> }))} />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader title="Μηνύματα επισκέπτη" description="Οδηγίες άφιξης και άλλη επικοινωνία" />
            <CardContent className="grid gap-4">
              {open && <MessageComposer guestId={r.guestId} reservationId={r.id} guestLanguageName={languageName(guest.language)} aiEnabled={Boolean(process.env.AI_API_KEY)} />}
              <MessageList messages={messages} />
            </CardContent>
          </Card>
        </div>
        <div className="grid min-w-0 grid-cols-1 content-start gap-6">
          <Card>
            <CardHeader title="Ανάλυση τιμής & φόροι" description={tax.ama ? `ΑΜΑ ${tax.ama}` : "Το ακίνητο δεν έχει ΑΜΑ"} />
            <CardContent className="grid gap-3 text-sm">
              {tax.complimentary ? (
                <p className="text-[13px] text-muted-foreground">Δωρεάν φιλοξενία: δεν είναι μίσθωση — χωρίς έσοδο, ΤΑΚΚ και δήλωση διαμονής.</p>
              ) : (
                <>
                  <PriceBreakdown tax={tax} source={r.source} />
                  {tax.longStay ? (
                    <p className="text-[13px] text-muted-foreground">60+ νύχτες: δεν είναι βραχυχρόνια μίσθωση — δηλώνεται ως κανονική μίσθωση.</p>
                  ) : tax.declaration.required ? (
                    <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                      <div>
                        <div className="text-[13px] text-muted-foreground">Δήλωση διαμονής</div>
                        {tax.declaration.status === "DECLARED" ? (
                          <Badge tone="success">Δηλώθηκε</Badge>
                        ) : (
                          <Badge tone={tax.declaration.overdue ? "danger" : "neutral"}>
                            {tax.declaration.overdue ? "Εκπρόθεσμη · " : "Έως "}{formatDay(tax.declaration.deadline, { day: "numeric", month: "short", year: "numeric" })}
                          </Badge>
                        )}
                      </div>
                      {tax.declaration.triggerDate <= new Date().toISOString().slice(0, 10) && <DeclareButton reservationId={r.id} declared={tax.declaration.status === "DECLARED"} />}
                    </div>
                  ) : (
                    <p className="text-[13px] text-muted-foreground">Δεν απαιτείται δήλωση διαμονής.</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Επικοινωνία" />
            <CardContent>
              <DefinitionList items={[{ label: "Email", value: r.guestEmail }, { label: "Τηλέφωνο", value: r.guestPhone }]} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader
              title="Εργασίες"
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/tasks?new=1&propertyId=${r.propertyId}&reservationId=${r.id}`}><ClipboardList /> Προσθήκη</Link>
                </Button>
              }
            />
            {tasks.length ? <TaskListCompact tasks={tasks} showProperty={false} /> : <EmptyState title="Δεν υπάρχουν εργασίες για τη διαμονή" description="Προσθέστε καθαρισμό ή εργασία άφιξης." />}
          </Card>
        </div>
      </div>
    </>
  );
}
