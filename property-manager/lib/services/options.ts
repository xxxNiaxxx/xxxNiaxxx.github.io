import { db } from "@/lib/db";
import type { OrgContext } from "@/lib/permissions";
import { toNumber } from "./serializers";
import { getTaxContext } from "./tax";

/** Lightweight lists for form selects. */
export async function getFormOptions(ctx: OrgContext) {
  const [properties, guests, members, tax] = await Promise.all([
    db.property.findMany({
      where: { organizationId: ctx.organizationId },
      select: { id: true, name: true, basePrice: true, currency: true, maxGuests: true, status: true, kind: true, areaSqm: true },
      orderBy: { name: "asc" },
    }),
    db.guest.findMany({
      where: { organizationId: ctx.organizationId },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    db.organizationMember.findMany({
      where: { organizationId: ctx.organizationId },
      select: { user: { select: { id: true, name: true, email: true } } },
    }),
    getTaxContext(ctx),
  ]);
  return {
    properties: properties.map((p) => ({ ...p, basePrice: toNumber(p.basePrice) })),
    guests: guests.map((g) => ({ id: g.id, fullName: `${g.firstName} ${g.lastName}`, email: g.email })),
    members: members.map((m) => ({ id: m.user.id, name: m.user.name ?? m.user.email })),
    /** For the reservation form's live ΤΑΚΚ/commission preview. */
    pricing: { regime: tax.regime, commissionRates: tax.commissionRates },
  };
}
export type FormOptions = Awaited<ReturnType<typeof getFormOptions>>;
