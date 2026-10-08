import type { CalendarFeed, Reservation } from "@prisma/client";
import { db } from "@/lib/db";
import { dateToISO, isoToDate } from "@/lib/dates";
import { sendEmail } from "@/lib/email";
import { AppError } from "@/lib/errors";
import type { IcsEvent } from "@/lib/ical/ics";
import { hasRole, type OrgContext } from "@/lib/permissions";
import { SOURCE_LABELS } from "@/lib/reservation-sources";

type Overlap = Pick<Reservation, "id" | "checkIn" | "checkOut">;

/**
 * Whether a calendar stay only mirrors reservations we already have: the
 * platform blocks the dates we sent it (our export link), so its calendar shows
 * them back — one block per stay, or one block for back-to-back stays. Such a
 * block starts and ends exactly with the reservations it covers. A real double
 * booking (e.g. 11–13 inside a 10–15 stay) does not.
 */
export function isMirror(e: Pick<IcsEvent, "start" | "end">, overlaps: Overlap[]) {
  const sorted = [...overlaps].sort((a, b) => a.checkIn.getTime() - b.checkIn.getTime());
  if (!sorted.length || dateToISO(sorted[0].checkIn) !== e.start || dateToISO(sorted.at(-1)!.checkOut) !== e.end) return false;
  return sorted.every((r, i) => i === 0 || dateToISO(sorted[i - 1].checkOut) === dateToISO(r.checkIn));
}

/** Public address for links in emails sent outside a request (sync, cron). */
function appUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  return url.replace(/\/$/, "") || null;
}

/** Records (once) a calendar stay that overlaps other reservations and emails the owners and admins. */
export async function recordConflict(feed: CalendarFeed, e: IcsEvent, code: string | null, overlaps: Overlap[]) {
  const key = { feedId: feed.id, icalUid: e.uid, start: isoToDate(e.start), end: isoToDate(e.end) };
  const existing = await db.calendarConflict.findUnique({ where: { feedId_icalUid_start_end: key } });
  if (existing) {
    if (existing.resolvedAt) await db.calendarConflict.update({ where: { id: existing.id }, data: { resolvedAt: null, reservationIds: overlaps.map((r) => r.id) } });
    return existing;
  }
  const conflict = await db.calendarConflict.create({
    data: { ...key, organizationId: feed.organizationId, propertyId: feed.propertyId, code, reservationIds: overlaps.map((r) => r.id) },
  });
  await notify(conflict.id);
  return conflict;
}

async function notify(conflictId: string) {
  const c = await describe(conflictId);
  if (!c) return;
  const admins = await db.organizationMember.findMany({
    where: { organizationId: c.organizationId, role: { in: ["OWNER", "ADMIN"] } },
    select: { user: { select: { email: true } } },
  });
  if (!admins.length) return;
  const base = appUrl();
  const sent = await sendEmail({
    to: admins.map((a) => a.user.email),
    subject: `Πιθανή διπλοκράτηση: ${c.propertyName} ${c.startLabel}`,
    text: [
      `Το ημερολόγιο ${c.sourceLabel} δείχνει κράτηση ${c.startLabel} – ${c.endLabel}${c.code ? ` (${c.code})` : ""} στο ${c.propertyName}, ενώ οι ημερομηνίες είναι ήδη πιασμένες:`,
      c.overlaps.map((o) => `• ${o.guestName} · ${o.sourceLabel} · ${o.checkInLabel} – ${o.checkOutLabel}`).join("\n"),
      "Ελέγξτε τις δύο κρατήσεις στις πλατφόρμες. Αν είναι διπλοκράτηση, επικοινωνήστε άμεσα με τον έναν επισκέπτη για μετακίνηση ή ακύρωση. Βεβαιωθείτε επίσης ότι κάθε πλατφόρμα έχει τον σύνδεσμο ημερολογίου του καταλύματος από την εφαρμογή.",
    ].join("\n\n"),
    ...(base && c.overlaps[0] ? { action: { label: "Άνοιγμα κράτησης", url: `${base}/reservations/${c.overlaps[0].id}` } } : {}),
  });
  if (sent) await db.calendarConflict.update({ where: { id: conflictId }, data: { notifiedAt: new Date() } });
}

const dm = (d: Date) => {
  const iso = dateToISO(d);
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
};

async function describe(id: string) {
  const c = await db.calendarConflict.findUnique({ where: { id }, include: { feed: { include: { property: { select: { name: true } } } } } });
  if (!c) return null;
  const rows = await db.reservation.findMany({
    where: { id: { in: c.reservationIds }, status: { in: ["CONFIRMED", "PENDING"] } },
    include: { guest: { select: { firstName: true, lastName: true } } },
    orderBy: { checkIn: "asc" },
  });
  return {
    id: c.id,
    organizationId: c.organizationId,
    propertyId: c.propertyId,
    propertyName: c.feed.property.name,
    source: c.feed.source,
    sourceLabel: SOURCE_LABELS[c.feed.source] ?? c.feed.source,
    code: c.code,
    start: dateToISO(c.start),
    end: dateToISO(c.end),
    startLabel: dm(c.start),
    endLabel: dm(c.end),
    detectedAt: c.detectedAt.toISOString(),
    overlaps: rows.map((r) => ({
      id: r.id,
      guestName: `${r.guest.firstName} ${r.guest.lastName}`.replace(/ —$/, ""),
      source: r.source,
      sourceLabel: SOURCE_LABELS[r.source] ?? r.source,
      checkIn: dateToISO(r.checkIn),
      checkOut: dateToISO(r.checkOut),
      checkInLabel: dm(r.checkIn),
      checkOutLabel: dm(r.checkOut),
    })),
  };
}
export type CalendarConflictDTO = NonNullable<Awaited<ReturnType<typeof describe>>>;

/** After a sync: conflicts of stays no longer in the calendar (cancelled, moved) are resolved. */
export async function resolveGoneConflicts(feedId: string, stillThere: { uid: string; start: string; end: string }[]) {
  const open = await db.calendarConflict.findMany({ where: { feedId, resolvedAt: null } });
  const keys = new Set(stillThere.map((e) => `${e.uid}|${e.start}|${e.end}`));
  const gone = open.filter((c) => !keys.has(`${c.icalUid}|${dateToISO(c.start)}|${dateToISO(c.end)}`));
  if (gone.length) await db.calendarConflict.updateMany({ where: { id: { in: gone.map((c) => c.id) } }, data: { resolvedAt: new Date() } });
}

/** Possible double bookings still open (not resolved, not dismissed), optionally for one reservation. */
export async function listOpenConflicts(ctx: OrgContext, opts: { reservationId?: string } = {}) {
  const rows = await db.calendarConflict.findMany({
    where: {
      organizationId: ctx.organizationId,
      resolvedAt: null,
      dismissedAt: null,
      ...(opts.reservationId ? { reservationIds: { has: opts.reservationId } } : {}),
    },
    orderBy: { start: "asc" },
    select: { id: true },
  });
  // A conflict whose other stays were all cancelled is no longer a double booking.
  return (await Promise.all(rows.map((r) => describe(r.id)))).filter((c): c is CalendarConflictDTO => c !== null && c.overlaps.length > 0);
}

/** The team checked it: not a double booking. */
export async function dismissConflict(ctx: OrgContext, id: string) {
  if (!hasRole(ctx, "ADMIN")) throw new AppError("FORBIDDEN", "Μόνο ο ιδιοκτήτης και οι διαχειριστές");
  const c = await db.calendarConflict.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!c) throw new AppError("NOT_FOUND", "Δεν βρέθηκε");
  await db.calendarConflict.update({ where: { id }, data: { dismissedAt: new Date() } });
  return { dismissed: true };
}

export const conflictTitle = (c: CalendarConflictDTO) => `Πιθανή διπλοκράτηση στο ${c.propertyName}`;
export const conflictDetail = (c: CalendarConflictDTO) =>
  `${c.sourceLabel} ${c.startLabel}–${c.endLabel} πάνω σε ${c.overlaps.map((o) => `${o.guestName} (${o.sourceLabel} ${o.checkInLabel}–${o.checkOutLabel})`).join(", ")}`;

