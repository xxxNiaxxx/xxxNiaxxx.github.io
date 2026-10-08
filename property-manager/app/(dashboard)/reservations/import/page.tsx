import type { Metadata } from "next";
import { ImportWizard } from "@/components/reservations/import-wizard";
import { PageHeader } from "@/components/ui/misc";
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
        description="Από το αρχείο εξαγωγής του Booking.com ή του Airbnb — με τιμές, προμήθειες και ΤΑΚΚ."
      />
      <div className="max-w-5xl">
        <ImportWizard properties={properties} pricing={{ regime: tax.regime, commissionRates: tax.commissionRates }} />
      </div>
    </>
  );
}
