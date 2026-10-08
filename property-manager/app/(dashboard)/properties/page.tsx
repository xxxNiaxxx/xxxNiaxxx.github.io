import { BedDouble, Building2, MapPin, Plus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PropertyFormDialog } from "@/components/properties/property-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterSelect, SearchInput } from "@/components/ui/filters";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status";
import { getPageContext } from "@/lib/auth/page";
import { formatMoney } from "@/lib/format";
import { listProperties } from "@/lib/services/properties";
import { propertyListQuery } from "@/lib/validation/property";

export const metadata: Metadata = { title: "Ακίνητα" };

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const { ctx } = await getPageContext();
  const query = propertyListQuery.safeParse(await searchParams);
  const filters = query.success ? query.data : {};
  const properties = await listProperties(ctx, filters);
  const filtered = Boolean(filters.q || filters.status);

  return (
    <>
      <PageHeader
        title="Ακίνητα"
        description="Όλα σας τα καταλύματα με μια ματιά"
        actions={<PropertyFormDialog trigger={<Button><Plus /> Νέο ακίνητο</Button>} />}
      />
      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <SearchInput placeholder="Αναζήτηση ονόματος, πόλης ή διεύθυνσης" />
        <FilterSelect param="status" label="Όλες οι καταστάσεις" options={[{ value: "ACTIVE", label: "Ενεργά" }, { value: "INACTIVE", label: "Ανενεργά" }]} />
      </div>

      {properties.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Building2 />}
            title={filtered ? "Κανένα ακίνητο δεν ταιριάζει στα φίλτρα" : "Δεν υπάρχουν ακίνητα ακόμη"}
            description={filtered ? "Δοκιμάστε άλλη αναζήτηση ή κατάσταση." : "Προσθέστε το πρώτο σας ακίνητο για να δέχεστε κρατήσεις."}
            action={!filtered && <PropertyFormDialog trigger={<Button><Plus /> Προσθήκη ακινήτου</Button>} />}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {properties.map((p) => (
            <Link key={p.id} href={`/properties/${p.id}`} className="group">
              <Card className="h-full p-5 transition-all group-hover:border-border-strong group-hover:shadow-[var(--shadow-pop)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold tracking-tight">{p.name}</h2>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0" /> {p.city}, {p.country}
                    </p>
                  </div>
                  <StatusBadge value={p.status} />
                </div>
                <div className="mt-5 flex items-end justify-between">
                  <div className="flex gap-4 text-[13px] text-muted-foreground">
                    <span className="flex items-center gap-1"><BedDouble className="size-4" /> {p.bedrooms} υπν.</span>
                    <span className="flex items-center gap-1"><Users className="size-4" /> {p.maxGuests}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums">{formatMoney(p.basePrice, p.currency)}</div>
                    <div className="text-[11px] text-muted-foreground">ανά νύχτα</div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
