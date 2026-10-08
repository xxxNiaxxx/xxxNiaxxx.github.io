import { randomBytes } from "node:crypto";
import type { CalendarFeed } from "@prisma/client";
import { z } from "zod";
import { CALENDAR_SOURCES } from "@/lib/reservation-sources";
import { db } from "@/lib/db";
import { addDaysISO, dateToISO, isoToDate, todayISO } from "@/lib/dates";
import { AppError, conflict, notFound } from "@/lib/errors";
import { buildIcs, classifyEvent, parseIcs, type IcsEvent } from "@/lib/ical/ics";
import { label } from "@/lib/labels";
import { hasRole, type OrgContext } from "@/lib/permissions";
import { isMirror, recordConflict, resolveGoneConflicts } from "./calendar-conflicts";
import { cancelReservation, createReservation, updateReservation } from "./reservations";
import { assertProperty } from "./scope";

/** Feeds are re-read at most this often when the app asks for a sync. */
export const SYNC_INTERVAL_MINUTES = 30;
const MAX_ICS_BYTES = 5_000_000;

const feedInput = z.object({
  source: z.enum(CALENDAR_SOURCES),
  url: z
    .string()
    .trim()
    .url("Επικολλήστε ολόκληρο τον σύνδεσμο iCal (https://…)")
    .refine((u) => {
      try {
        const { protocol, hostname } = new URL(u.replace(/^webcal:/i, "https:"));
        // Only public https hosts — never the server's own network.
        return protocol === "https:" && hostname.includes(".") && !/^(localhost|[\d.]+|\[.*\])$/i.test(hostname) && !/\.(local|internal)$/i.test(hostname);
      } catch {
        return false;
      }
    }, "Ο σύνδεσμος πρέπει να είναι https:// από το Airbnb, το Booking.com ή άλλη πλατφόρμα"),
});

function assertAdmin(ctx: OrgContext) {
  if (!hasRole(ctx, "ADMIN")) throw new AppError("FORBIDDEN", "Μόνο ο ιδιοκτήτης και οι διαχειριστές αλλάζουν τα ημερολόγια");
}

function serializeFeed(f: CalendarFeed) {
  return {
    id: f.id,
    propertyId: f.propertyId,
    source: f.source,
    /** Shown shortened: the link works as a password for the calendar. */
    url: f.url,
    lastSyncedAt: f.lastSyncedAt?.toISOString() ?? null,
    lastError: f.lastError,
  };
}
export type CalendarFeedDTO = ReturnType<typeof serializeFeed>;

export async function getPropertyCalendars(ctx: OrgContext, propertyId: string) {
  const property = await assertProperty(ctx, propertyId);
  const feeds = await db.calendarFeed.findMany({ where: { organizationId: ctx.organizationId, propertyId }, orderBy: { createdAt: "asc" } });
  return { feeds: feeds.map(serializeFeed), exportPath: property.icalToken ? `/api/ical/${property.icalToken}` : null };
}

export async function addFeed(ctx: OrgContext, propertyId: string, input: unknown) {
  assertAdmin(ctx);
  await assertProperty(ctx, propertyId);
  const data = feedInput.parse(input);
  const url = data.url.replace(/^webcal:/i, "https:");
  const exists = await db.calendarFeed.findFirst({ where: { propertyId, url } });
  if (exists) throw conflict("Αυτό το ημερολόγιο έχει ήδη προστεθεί");
  const feed = await db.calendarFeed.create({ data: { organizationId: ctx.organizationId, propertyId, source: data.source, url } });
  const result = await syncFeed(feed);
  return { feed: serializeFeed(await db.calendarFeed.findUniqueOrThrow({ where: { id: feed.id } })), result };
}

export async function deleteFeed(ctx: OrgContext, id: string) {
  assertAdmin(ctx);
  const feed = await db.calendarFeed.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!feed) throw notFound("Calendar");
  // Reservations it created stay (they may have amounts by now); they just stop following the feed.
  await db.calendarFeed.delete({ where: { id } });
}

/** Creates (or replaces) the secret link of the property's own iCal export. */
export async function rotateExportToken(ctx: OrgContext, propertyId: string) {
  assertAdmin(ctx);
  await assertProperty(ctx, propertyId);
  const token = randomBytes(18).toString("base64url");
  await db.property.update({ where: { id: propertyId }, data: { icalToken: token } });
  return { exportPath: `/api/ical/${token}` };
}

/** Public iCal of a property's stays (no guest data), for Airbnb/Booking to block those dates. */
export async function exportIcs(token: string, now = new Date()) {
  const property = await db.property.findUnique({ where: { icalToken: token } });
  if (!property) return null;
  const from = addDaysISO(todayISO(now), -30);
  const stays = await db.reservation.findMany({
    where: { propertyId: property.id, status: { in: ["CONFIRMED", "PENDING", "COMPLETED"] }, checkOut: { gte: isoToDate(from) } },
    select: { id: true, checkIn: true, checkOut: true },
    orderBy: { checkIn: "asc" },
  });
  return buildIcs(
    property.name,
    stays.map((s) => ({ uid: `${s.id}@brachychronia.ai`, start: dateToISO(s.checkIn), end: dateToISO(s.checkOut), summary: "Μη διαθέσιμο" })),
    now,
  );
}

/** Errors whose message is meant for the user (others become a generic message). */
class FeedError extends Error {}

async function fetchIcs(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { "User-Agent": "Brachychronia.ai calendar sync", Accept: "text/calendar, */*" }, redirect: "follow" });
  if (!res.ok) throw new FeedError(`Το ημερολόγιο απάντησε με σφάλμα ${res.status}. Ελέγξτε τον σύνδεσμο.`);
  if (Number(res.headers.get("content-length") ?? 0) > MAX_ICS_BYTES) throw new FeedError("Το ημερολόγιο είναι πολύ μεγάλο");
  const text = await res.text();
  if (text.length > MAX_ICS_BYTES) throw new FeedError("Το ημερολόγιο είναι πολύ μεγάλο");
  return text;
}

async function placeholderGuest(organizationId: string, source: string) {
  const lastName = label(source);
  const existing = await db.guest.findFirst({ where: { organizationId, firstName: "Επισκέπτης", lastName } });
  return existing?.id ?? (await db.guest.create({ data: { organizationId, firstName: "Επισκέπτης", lastName, notes: "Κρατήσεις από το ημερολόγιο (iCal) χωρίς όνομα επισκέπτη." } })).id;
}

export interface SyncResult { created: number; updated: number; cancelled: number; skipped: number; error?: string }

/**
 * Reads a feed and brings its stays into the app: new stays are created
 * (amount and guest to be filled in), changed dates are updated, stays that
 * disappeared before arrival are cancelled. Dates already taken by another
 * reservation are left alone (e.g. the same booking entered by hand).
 */
export async function syncFeed(feed: CalendarFeed, now = new Date(), fetchText: (url: string) => Promise<string> = fetchIcs): Promise<SyncResult> {
  const ctx: OrgContext = { userId: "calendar-sync", organizationId: feed.organizationId, role: "OWNER" };
  const today = todayISO(now);
  const result: SyncResult = { created: 0, updated: 0, cancelled: 0, skipped: 0 };
  try {
    const text = await fetchText(feed.url);
    if (!text.includes("BEGIN:VCALENDAR")) throw new FeedError("Ο σύνδεσμος δεν είναι ημερολόγιο iCal (.ics)");
    const events = parseIcs(text)
      .map((e) => ({ e, ...classifyEvent(feed.source, e) }))
      // Past stays come from the platform's export file, not the calendar.
      .filter(({ stay, e }) => stay && e.end >= addDaysISO(today, -3));
    const seen = new Set<string>();
    const eventKeys: { uid: string; start: string; end: string }[] = [];

    for (const { e, code, phoneLast4 } of events) {
      seen.add(e.uid);
      eventKeys.push({ uid: e.uid, start: e.start, end: e.end });
      try {
        await syncEvent(ctx, feed, e, code, phoneLast4, result);
      } catch {
        result.skipped++;
      }
    }

    // Stays removed from the platform calendar before arrival were cancelled there.
    const gone = await db.reservation.findMany({
      where: { calendarFeedId: feed.id, status: { in: ["CONFIRMED", "PENDING"] }, checkIn: { gt: isoToDate(today) }, icalUid: { notIn: [...seen] } },
      select: { id: true },
    });
    for (const r of gone) {
      await cancelReservation(ctx, r.id);
      result.cancelled++;
    }
    await resolveGoneConflicts(feed.id, eventKeys);
    await db.calendarFeed.update({ where: { id: feed.id }, data: { lastSyncedAt: now, lastError: null } });
  } catch (e) {
    result.error = e instanceof FeedError ? e.message : "Δεν ήταν δυνατή η σύνδεση με το ημερολόγιο. Ελέγξτε τον σύνδεσμο ή δοκιμάστε αργότερα.";
    await db.calendarFeed.update({ where: { id: feed.id }, data: { lastSyncedAt: now, lastError: result.error } });
  }
  return result;
}

async function syncEvent(ctx: OrgContext, feed: CalendarFeed, e: IcsEvent, code: string | null, phoneLast4: string | null, result: SyncResult) {
  let existing = await db.reservation.findFirst({ where: { calendarFeedId: feed.id, icalUid: e.uid } });
  if (!existing && code) {
    // Already imported from the platform's export file: just link it to the calendar.
    existing = await db.reservation.findFirst({ where: { organizationId: feed.organizationId, source: feed.source, externalId: code } });
    if (existing) await db.reservation.update({ where: { id: existing.id }, data: { calendarFeedId: feed.id, icalUid: e.uid } });
  }
  if (existing) {
    if (existing.status === "CANCELLED") return; // cancelled or dismissed in the app: never revived
    if (dateToISO(existing.checkIn) !== e.start || dateToISO(existing.checkOut) !== e.end) {
      await updateReservation(ctx, existing.id, { checkIn: e.start, checkOut: e.end });
      result.updated++;
    }
    return;
  }
  const taken = await db.reservation.findMany({
    where: { propertyId: feed.propertyId, status: { in: ["CONFIRMED", "PENDING"] }, checkIn: { lt: isoToDate(e.end) }, checkOut: { gt: isoToDate(e.start) } },
    select: { id: true, checkIn: true, checkOut: true },
  });
  if (taken.length) {
    // Dates already taken: the same stay entered by hand, our own dates mirrored back, or a double booking.
    if (!isMirror(e, taken)) await recordConflict(feed, e, code, taken);
    result.skipped++;
    return;
  }
  const created = await createReservation(ctx, {
    propertyId: feed.propertyId,
    guestId: await placeholderGuest(feed.organizationId, feed.source),
    checkIn: e.start,
    checkOut: e.end,
    guestsCount: 1,
    totalAmount: 0,
    source: feed.source,
    status: e.end <= todayISO() ? "COMPLETED" : "CONFIRMED",
    confirmationCode: code ?? undefined,
    externalId: code ?? undefined,
    notes: [`Από το ημερολόγιο ${label(feed.source)} — συμπληρώστε ποσό και επισκέπτη (ή κάντε εισαγωγή του αρχείου κρατήσεων).`, phoneLast4 ? `Τηλέφωνο: …${phoneLast4}` : null].filter(Boolean).join("\n"),
  });
  await db.reservation.update({ where: { id: created.id }, data: { calendarFeedId: feed.id, icalUid: e.uid } });
  // The dates were freed (the other stay was cancelled): no longer a double booking.
  await db.calendarConflict.updateMany({ where: { feedId: feed.id, icalUid: e.uid, resolvedAt: null }, data: { resolvedAt: new Date() } });
  result.created++;
}

/** Syncs the organization's feeds that were not read in the last SYNC_INTERVAL_MINUTES (or all with force). */
export async function syncOrganizationFeeds(ctx: OrgContext, opts: { propertyId?: string; force?: boolean } = {}, now = new Date()) {
  if (opts.propertyId) await assertProperty(ctx, opts.propertyId);
  if (opts.force && !hasRole(ctx, "ADMIN")) throw new AppError("FORBIDDEN", "Μόνο ο ιδιοκτήτης και οι διαχειριστές συγχρονίζουν χειροκίνητα");
  const staleBefore = new Date(now.getTime() - SYNC_INTERVAL_MINUTES * 60_000);
  const feeds = await db.calendarFeed.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(opts.propertyId ? { propertyId: opts.propertyId } : {}),
      ...(opts.force ? {} : { OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: staleBefore } }] }),
    },
  });
  const totals: SyncResult = { created: 0, updated: 0, cancelled: 0, skipped: 0 };
  const errors: string[] = [];
  for (const f of feeds) {
    const r = await syncFeed(f, now);
    totals.created += r.created;
    totals.updated += r.updated;
    totals.cancelled += r.cancelled;
    totals.skipped += r.skipped;
    if (r.error) errors.push(r.error);
  }
  return { feeds: feeds.length, ...totals, errors };
}

/** Cron: every feed of every organization. */
export async function syncAllFeeds(now = new Date()) {
  const feeds = await db.calendarFeed.findMany();
  let created = 0;
  for (const f of feeds) created += (await syncFeed(f, now)).created;
  return { feeds: feeds.length, created };
}

