"use client";

import { Building2, CalendarSync, Check, FileSpreadsheet, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PropertyFormDialog } from "@/components/properties/property-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const DISMISSED = "getting-started-dismissed";

/**
 * First steps for a new account, in order: the property, the reservations
 * from the Booking/Airbnb export file, the platforms' calendars. Each step
 * opens once the one before it is done.
 */
export function GettingStarted({
  steps,
  firstPropertyId,
}: {
  steps: { property: boolean; reservations: boolean; calendars: boolean };
  firstPropertyId: string | null;
}) {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISSED) === "1");
    } catch {}
  }, []);
  if (dismissed) return null;

  const doneCount = Object.values(steps).filter(Boolean).length;
  const current = !steps.property ? "property" : !steps.reservations ? "reservations" : "calendars";

  return (
    <Card className="mb-6 border-accent/40">
      <CardHeader
        title="Πρώτα βήματα"
        description={`${doneCount} από 3 · περίπου 5 λεπτά και η εφαρμογή είναι έτοιμη`}
        action={
          steps.property && steps.reservations ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                try {
                  localStorage.setItem(DISMISSED, "1");
                } catch {}
                setDismissed(true);
              }}
            >
              Απόκρυψη
            </Button>
          ) : null
        }
      />
      <CardContent>
        <ol className="grid gap-3">
          <Step n={1} done={steps.property} active={current === "property"} icon={<Building2 />} title="Προσθέστε το κατάλυμα">
            <p>Όνομα, πόλη και ο <strong>ΑΜΑ</strong> από το Μητρώο της ΑΑΔΕ. Χρειάζεται για τις δηλώσεις και το ΤΑΚΚ.</p>
            <div className="mt-3">
              <PropertyFormDialog trigger={<Button size="sm"><Plus /> Προσθήκη καταλύματος</Button>} />
            </div>
          </Step>

          <Step n={2} done={steps.reservations} active={current === "reservations"} icon={<FileSpreadsheet />} title="Ανεβάστε το αρχείο κρατήσεων">
            <p>Κατεβάστε το αρχείο από την πλατφόρμα και ανεβάστε το. Η εφαρμογή βρίσκει μόνη της τιμές, προμήθειες και ΤΑΚΚ.</p>
            <ul className="mt-2 grid gap-1.5">
              <li>
                <strong>Booking.com:</strong> Extranet → <em>Κρατήσεις</em> → επιλέξτε ημερομηνίες (π.χ. από 1 Ιανουαρίου) → <em>Λήψη</em>
              </li>
              <li>
                <strong>Airbnb:</strong> Πίνακας οικοδεσπότη → <em>Κρατήσεις</em> → <em>Όλες</em> → <em>Εξαγωγή</em> (CSV)
              </li>
            </ul>
            <p className="mt-2 text-xs">Καλύτερα από υπολογιστή: στο κινητό οι πλατφόρμες συνήθως δεν δίνουν το αρχείο.</p>
            <div className="mt-3">
              <Button size="sm" asChild><Link href="/reservations/import"><FileSpreadsheet /> Ανέβασμα αρχείου</Link></Button>
            </div>
          </Step>

          <Step n={3} done={steps.calendars} active={current === "calendars"} icon={<CalendarSync />} title="Συνδέστε τα ημερολόγια (iCal)">
            <p>Οι νέες κρατήσεις έρχονται μόνες τους κάθε πρωί και η εφαρμογή σας προειδοποιεί για διπλές κρατήσεις.</p>
            <p className="mt-1">Αντιγράψτε τον σύνδεσμο «Εξαγωγή ημερολογίου» από τη Booking και το Airbnb και επικολλήστε τον στο κατάλυμα.</p>
            {firstPropertyId && (
              <div className="mt-3">
                <Button size="sm" asChild><Link href={`/properties/${firstPropertyId}#calendars`}><CalendarSync /> Σύνδεση ημερολογίων</Link></Button>
              </div>
            )}
          </Step>
        </ol>
      </CardContent>
    </Card>
  );
}

function Step({
  n,
  done,
  active,
  icon,
  title,
  children,
}: {
  n: number;
  done: boolean;
  active: boolean;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className={cn("rounded-xl border p-3 sm:p-4", active ? "border-accent bg-accent/5" : "border-border")}>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold [&_svg]:size-4",
            done ? "bg-success text-white" : active ? "bg-accent text-white" : "bg-muted text-muted-foreground",
          )}
        >
          {done ? <Check /> : n}
        </span>
        <span className={cn("flex items-center gap-2 font-medium [&_svg]:size-4 [&_svg]:text-muted-foreground", done && "text-muted-foreground line-through")}>
          {icon}
          {title}
        </span>
      </div>
      {active && !done && <div className="mt-2 pl-10 text-[13px] text-muted-foreground">{children}</div>}
    </li>
  );
}
