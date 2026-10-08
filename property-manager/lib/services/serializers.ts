import type { Guest, Prisma, Property, Reservation, Task, Message, Transaction } from "@prisma/client";
import { dateToISO, diffDaysISO } from "@/lib/dates";
import { checklistSchema, type ChecklistItem } from "@/lib/validation/task";

/** API/UI shapes. Prisma rows never leave the services layer directly. */

export const toNumber = (d: Prisma.Decimal | number | null | undefined) => (d == null ? 0 : Number(d));

export function serializeProperty(p: Property) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    address: p.address,
    city: p.city,
    country: p.country,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    maxGuests: p.maxGuests,
    status: p.status,
    basePrice: toNumber(p.basePrice),
    currency: p.currency,
    ama: p.ama,
    kind: p.kind,
    areaSqm: p.areaSqm,
    compliance: (p.compliance ?? {}) as Record<string, boolean | string | null>,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
export type PropertyDTO = ReturnType<typeof serializeProperty>;

export function serializeGuest(g: Guest) {
  return {
    id: g.id,
    firstName: g.firstName,
    lastName: g.lastName,
    fullName: `${g.firstName} ${g.lastName}`,
    email: g.email,
    phone: g.phone,
    country: g.country,
    notes: g.notes,
    createdAt: g.createdAt.toISOString(),
  };
}
export type GuestDTO = ReturnType<typeof serializeGuest>;

type ReservationRow = Reservation & {
  property?: Pick<Property, "id" | "name"> | null;
  guest?: Pick<Guest, "id" | "firstName" | "lastName" | "email" | "phone"> | null;
};

export function serializeReservation(r: ReservationRow) {
  const checkIn = dateToISO(r.checkIn);
  const checkOut = dateToISO(r.checkOut);
  return {
    id: r.id,
    propertyId: r.propertyId,
    propertyName: r.property?.name ?? null,
    guestId: r.guestId,
    guestName: r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : null,
    guestEmail: r.guest?.email ?? null,
    guestPhone: r.guest?.phone ?? null,
    source: r.source,
    confirmationCode: r.confirmationCode,
    checkIn,
    checkOut,
    nights: diffDaysISO(checkIn, checkOut),
    guestsCount: r.guestsCount,
    totalAmount: toNumber(r.totalAmount),
    currency: r.currency,
    status: r.status,
    notes: r.notes,
    declarationStatus: r.declarationStatus,
    cancelledAt: r.cancelledAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}
export type ReservationDTO = ReturnType<typeof serializeReservation>;

export function parseChecklist(value: unknown): ChecklistItem[] {
  const parsed = checklistSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

type TaskRow = Task & {
  property?: Pick<Property, "id" | "name"> | null;
  assignedTo?: { id: string; name: string | null; email: string } | null;
};

export function serializeTask(t: TaskRow, now: Date = new Date()) {
  const open = t.status === "TODO" || t.status === "IN_PROGRESS";
  return {
    id: t.id,
    propertyId: t.propertyId,
    propertyName: t.property?.name ?? null,
    reservationId: t.reservationId,
    title: t.title,
    description: t.description,
    type: t.type,
    status: t.status,
    priority: t.priority,
    checklist: parseChecklist(t.checklist),
    dueAt: t.dueAt?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    assignedToUserId: t.assignedToUserId,
    assigneeName: t.assignedTo ? (t.assignedTo.name ?? t.assignedTo.email) : null,
    overdue: open && t.dueAt != null && t.dueAt < now,
    createdAt: t.createdAt.toISOString(),
  };
}
export type TaskDTO = ReturnType<typeof serializeTask>;

export function serializeMessage(m: Message) {
  return {
    id: m.id,
    reservationId: m.reservationId,
    guestId: m.guestId,
    direction: m.direction,
    channel: m.channel,
    content: m.content,
    status: m.status,
    sentAt: m.sentAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}
export type MessageDTO = ReturnType<typeof serializeMessage>;

export function serializeTransaction(t: Transaction & { property?: Pick<Property, "name"> | null }) {
  return {
    id: t.id,
    propertyId: t.propertyId,
    propertyName: t.property?.name ?? null,
    reservationId: t.reservationId,
    type: t.type,
    category: t.category,
    amount: toNumber(t.amount),
    currency: t.currency,
    description: t.description,
    transactionDate: dateToISO(t.transactionDate),
  };
}
export type TransactionDTO = ReturnType<typeof serializeTransaction>;
