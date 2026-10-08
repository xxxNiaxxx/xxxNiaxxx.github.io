import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { addDaysISO, dateToISO, diffDaysISO, isoToDate, todayISO } from "@/lib/dates";
import { sendEmail } from "@/lib/email";
import { AppError, notFound } from "@/lib/errors";
import { guestLanguage, type GuestLanguage } from "@/lib/i18n/guest-language";
import { GUEST_PAGE_LANGUAGES, guestPageText } from "@/lib/i18n/guest-pages";
import { climateFeeForStay, type PropertyKind } from "@/lib/tax/gr";
import { hasRole, type OrgContext } from "@/lib/permissions";
import { isoDate, optionalEmail, optionalText } from "@/lib/validation/common";
import { assertProperty } from "./scope";

const newToken = () => randomBytes(18).toString("base64url");
const GUEST_PAGE_LANGUAGE_SET = new Set<string>(GUEST_PAGE_LANGUAGES);

// ─── Online check-in ─────────────────────────────────────────────────

/** The reservation's online check-in link (created on first use). */
export async function checkinLink(ctx: OrgContext, reservationId: string) {
  const r = await db.reservation.findFirst({ where: { id: reservationId, organizationId: ctx.organizationId } });
  if (!r) throw notFound("Reservation");
  const token = r.checkinToken ?? newToken();
  if (!r.checkinToken) await db.reservation.update({ where: { id: r.id }, data: { checkinToken: token } });
  return { path: `/checkin/${token}` };
}

/** What the guest's check-in page shows, or null for an unknown or cancelled stay. */
export async function getCheckin(token: string) {
  const r = await db.reservation.findUnique({
    where: { checkinToken: token },
    include: { guest: true, property: true },
  });
  if (!r || r.status === "CANCELLED") return null;
  return {
    propertyName: r.property.name,
    city: r.property.city,
    checkIn: dateToISO(r.checkIn),
    checkOut: dateToISO(r.checkOut),
    checkInTime: r.property.checkInTime,
    checkOutTime: r.property.checkOutTime,
    houseRules: r.property.houseRules,
    guestFirstName: r.guest.firstName,
    language: guestLanguage(r.guest) as GuestLanguage,
    completed: !!r.checkinCompletedAt,
    guidePath: r.property.publicToken ? `/guide/${r.property.publicToken}` : null,
    prefill: { phone: r.guest.phone ?? "", email: r.guest.email ?? "", country: r.guest.country ?? "" },
  };
}

const checkinInput = z.object({
  idNumber: z.string().trim().min(4, "required").max(40),
  phone: optionalText(40),
  email: optionalEmail,
  country: optionalText(80),
  arrivalTime: optionalText(5).refine((v) => !v || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), "time"),
  acceptRules: z.boolean().optional(),
  consent: z.literal(true, { error: "mustAccept" }),
});

/** Saves the guest's check-in: identity for the AADE declaration, contact details, arrival time. */
export async function submitCheckin(token: string, input: unknown, now = new Date()) {
  const r = await db.reservation.findUnique({ where: { checkinToken: token }, include: { property: true, guest: true } });
  if (!r || r.status === "CANCELLED") throw new AppError("NOT_FOUND", "notFound");
  const data = checkinInput.parse(input);
  if (r.property.houseRules && !data.acceptRules) throw new AppError("BAD_REQUEST", "mustAccept");
  await db.$transaction([
    db.guest.update({
      where: { id: r.guestId },
      data: {
        idNumber: data.idNumber,
        ...(data.phone ? { phone: data.phone } : {}),
        ...(data.email ? { email: data.email } : {}),
        ...(data.country ? { country: data.country } : {}),
      },
    }),
    db.reservation.update({
      where: { id: r.id },
      data: { checkinCompletedAt: now, arrivalTime: data.arrivalTime ?? null, rulesAcceptedAt: r.property.houseRules ? now : null },
    }),
  ]);
  return { completed: true };
}

// ─── Public pages of a property (guest guide, direct booking) ────────

/** The token of the property's public pages (created on first use). */
export async function publicPagesLink(ctx: OrgContext, propertyId: string) {
  const p = await assertProperty(ctx, propertyId);
  const token = p.publicToken ?? newToken();
  if (!p.publicToken) await db.property.update({ where: { id: p.id }, data: { publicToken: token } });
  return { guidePath: `/guide/${token}`, bookingPath: `/book/${token}` };
}

/** Turns the direct booking page on or off. */
export async function setDirectBooking(ctx: OrgContext, propertyId: string, enabled: boolean) {
  if (!hasRole(ctx, "ADMIN")) throw new AppError("FORBIDDEN", "Μόνο ο ιδιοκτήτης και οι διαχειριστές");
  await assertProperty(ctx, propertyId);
  await db.property.update({ where: { id: propertyId }, data: { directBooking: enabled } });
  return { ...(await publicPagesLink(ctx, propertyId)), directBooking: enabled };
}

/**
 * The guest guide: the property's practical information. Notes saved in the
 * requested language come first; notes in other languages follow only when
 * there is nothing in that language.
 */
export async function getGuide(token: string, language: string) {
  const p = await db.property.findUnique({ where: { publicToken: token } });
  if (!p || p.status !== "ACTIVE") return null;
  const notes = await db.aIMemory.findMany({
    where: { organizationId: p.organizationId, kind: "GUEST_INFO", active: true, OR: [{ propertyId: p.id }, { propertyId: null }] },
    orderBy: [{ propertyId: "desc" }, { createdAt: "asc" }],
  });
  const inLanguage = notes.filter((n) => (n.language ?? "en") === language);
  const languages = [...new Set(notes.map((n) => n.language ?? "en"))];
  return {
    propertyName: p.name,
    description: p.description,
    address: p.address,
    city: p.city,
    checkInTime: p.checkInTime,
    checkOutTime: p.checkOutTime,
    houseRules: p.houseRules,
    notes: (inLanguage.length ? inLanguage : notes).map((n) => n.content),
    /** Languages the host wrote notes in. */
    languages,
    directBooking: p.directBooking,
  };
}

// ─── Direct booking ──────────────────────────────────────────────────

const MAX_NIGHTS = 59;
/** First line of the notes of a request from the booking page (the dashboard lists them). */
export const BOOKING_REQUEST_NOTE = "Αίτημα από τη σελίδα απευθείας κρατήσεων.";

async function bookableProperty(token: string) {
  const p = await db.property.findUnique({ where: { publicToken: token } });
  return p && p.status === "ACTIVE" && p.directBooking ? p : null;
}

async function isFree(propertyId: string, checkIn: string, checkOut: string) {
  const clash = await db.reservation.findFirst({
    where: { propertyId, status: "CONFIRMED", checkIn: { lt: isoToDate(checkOut) }, checkOut: { gt: isoToDate(checkIn) } },
    select: { id: true },
  });
  return !clash;
}

/** The booking page: the property, its nightly price and the dates already taken (next 12 months). */
export async function getBookingPage(token: string, now = new Date()) {
  const p = await bookableProperty(token);
  if (!p) return null;
  const today = todayISO(now);
  const taken = await db.reservation.findMany({
    where: { propertyId: p.id, status: "CONFIRMED", checkOut: { gt: isoToDate(today) }, checkIn: { lt: isoToDate(addDaysISO(today, 366)) } },
    select: { checkIn: true, checkOut: true },
    orderBy: { checkIn: "asc" },
  });
  return {
    propertyName: p.name,
    description: p.description,
    city: p.city,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    maxGuests: p.maxGuests,
    basePrice: Number(p.basePrice),
    currency: p.currency,
    checkInTime: p.checkInTime,
    checkOutTime: p.checkOutTime,
    houseRules: p.houseRules,
    today,
    taken: taken.map((r) => ({ from: dateToISO(r.checkIn), to: dateToISO(r.checkOut) })),
  };
}

const stayDates = z
  .object({ checkIn: isoDate, checkOut: isoDate })
  .refine((v) => v.checkOut > v.checkIn, { message: "dates", path: ["checkOut"] });

/** Price of a stay on the booking page: nights × nightly price, plus the ΤΑΚΚ. */
export async function quoteStay(token: string, input: unknown, now = new Date()) {
  const p = await bookableProperty(token);
  if (!p) throw new AppError("NOT_FOUND", "notFound");
  const { checkIn, checkOut } = stayDates.parse(input);
  const nights = diffDaysISO(checkIn, checkOut);
  if (checkIn < todayISO(now) || nights > MAX_NIGHTS) throw new AppError("BAD_REQUEST", "dates");
  const rent = Math.round(Number(p.basePrice) * nights * 100) / 100;
  const climateFee = climateFeeForStay({ checkIn, checkOut, totalAmount: rent }, { kind: p.kind as PropertyKind, areaSqm: p.areaSqm });
  return { nights, rent, climateFee, total: Math.round((rent + climateFee) * 100) / 100, currency: p.currency, available: await isFree(p.id, checkIn, checkOut) };
}

const bookingInput = z.object({
  checkIn: isoDate,
  checkOut: isoDate,
  guestsCount: z.coerce.number().int().min(1).max(100),
  name: z.string().trim().min(2, "required").max(120),
  email: z.string().trim().toLowerCase().pipe(z.email({ error: "required" })),
  phone: optionalText(40),
  message: optionalText(2000),
  language: z.string().max(5).optional(),
});

/**
 * A booking request from the public page: a PENDING direct reservation the
 * team confirms (and agrees payment) themselves. Owners and admins get an
 * email; the guest gets a confirmation that the request was received.
 */
export async function requestBooking(token: string, input: unknown, origin: string, now = new Date()) {
  const p = await bookableProperty(token);
  if (!p) throw new AppError("NOT_FOUND", "notFound");
  const data = bookingInput.parse(input);
  const quote = await quoteStay(token, data, now);
  if (!quote.available) throw new AppError("CONFLICT", "unavailable");
  if (data.guestsCount > p.maxGuests) throw new AppError("BAD_REQUEST", "guests");

  const [firstName, ...rest] = data.name.split(/\s+/);
  const existing = await db.guest.findFirst({ where: { organizationId: p.organizationId, email: data.email } });
  const guest = existing ?? (await db.guest.create({
    data: { organizationId: p.organizationId, firstName, lastName: rest.join(" ") || "—", email: data.email, phone: data.phone ?? null, language: data.language && GUEST_PAGE_LANGUAGE_SET.has(data.language) ? data.language : null },
  }));
  const reservation = await db.reservation.create({
    data: {
      organizationId: p.organizationId,
      propertyId: p.id,
      guestId: guest.id,
      source: "DIRECT",
      status: "PENDING",
      checkIn: isoToDate(data.checkIn),
      checkOut: isoToDate(data.checkOut),
      guestsCount: data.guestsCount,
      totalAmount: quote.rent,
      currency: p.currency,
      notes: [BOOKING_REQUEST_NOTE, data.phone ? `Τηλέφωνο: ${data.phone}` : null, data.message ? `Μήνυμα: ${data.message}` : null].filter(Boolean).join("\n"),
    },
  });

  const admins = await db.organizationMember.findMany({
    where: { organizationId: p.organizationId, role: { in: ["OWNER", "ADMIN"] } },
    select: { user: { select: { email: true } } },
  });
  if (admins.length) {
    await sendEmail({
      to: admins.map((a) => a.user.email),
      subject: `Νέο αίτημα κράτησης: ${p.name} ${data.checkIn} → ${data.checkOut}`,
      text: [
        `${data.name} ζητά κράτηση στο ${p.name}: ${data.checkIn} → ${data.checkOut} (${quote.nights} νύχτες), ${data.guestsCount} άτομα.`,
        `Τιμή δωματίου ${quote.rent.toFixed(2)} € + ΤΑΚΚ ${quote.climateFee.toFixed(2)} € = ${quote.total.toFixed(2)} €.`,
        `${data.email}${data.phone ? ` · ${data.phone}` : ""}`,
        data.message ?? "",
        "Επικοινωνήστε με τον επισκέπτη για την πληρωμή και επιβεβαιώστε την κράτηση στην εφαρμογή (Κατάσταση → Επιβεβαιωμένη).",
      ].filter(Boolean).join("\n\n"),
      action: { label: "Άνοιγμα κράτησης", url: `${origin}/reservations/${reservation.id}` },
    });
  }
  const { t } = guestPageText(data.language);
  await sendEmail({ to: data.email, subject: `${t.bookTitle}: ${p.name}`, text: `${t.hello} ${firstName},\n\n${t.requestSent}\n\n${p.name} · ${data.checkIn} → ${data.checkOut}` });
  return { requested: true, reservationId: reservation.id };
}
