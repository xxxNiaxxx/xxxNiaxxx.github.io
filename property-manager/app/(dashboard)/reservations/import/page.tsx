import Link from "next/link";
import type { Metadata } from "next";
import { Building2, Plus } from "lucide-react";
import { PropertyFormDialog } from "@/components/properties/property-form";
import { ImportWizard } from "@/components/reservations/import-wizard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { getPageContext } from "@/lib/auth/page";
import { db } from "@/lib/db";
import { getTaxContext } from "@/lib/services/tax";

export const metadata: Metadata = { title: "Εισαγωγή κρατήσεων" };

export default async function ImportPage() {
  const { ctx } = await getPageContext();
  const [properties, tax] = await Promise.all([
    db.property.findMany({
      where: { organizationId: ctx.organizationId },
      select: { id: true, name: true, kind: true, areaSqm: true, maxGuests: true },
      orderBy: { name: "asc" },
    }),
    getTaxContext(ctx),
  ]);
  return (
    <>
      <PageHeader
        back={{ href: "/reservations", label: "Κρατήσεις" }}
        title="Εισαγωγή κρατήσεων"
        description={<>Από το αρχείο εξαγωγής του Booking.com, του Airbnb ή άλλης πλατφόρμας — με τιμές, προμήθειες και ΤΑΚΚ · <Link href="/help#airbnb-booking" className="text-accent underline-offset-4 hover:underline">Πώς κατεβάζω το αρχείο</Link> · <Link href="/help#booking-arxeio" className="text-accent underline-offset-4 hover:underline">Τα νούμερα του Booking</Link></>}
      />
      <div className="max-w-5xl">
        {properties.length === 0 ? (
          // Reservations are attached to a property: add it first.
          <Card>
            <EmptyState
              icon={<Building2 />}
              title="Πρώτα προσθέστε το κατάλυμα"
              description="Οι κρατήσεις του αρχείου μπαίνουν σε ένα κατάλυμα. Προσθέστε το (όνομα, πόλη, ΑΜΑ) και μετά ανεβάστε το αρχείο."
              action={<PropertyFormDialog trigger={<Button><Plus /> Προσθήκη καταλύματος</Button>} />}
            />
          </Card>
        ) : (
          <ImportWizard properties={properties} pricing={{ regime: tax.regime, commissionRates: tax.commissionRates }} />
        )}
      </div>
    </>
  );
}
