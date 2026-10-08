import { db } from "@/lib/db";
import { addDaysISO, dateToISO, diffDaysISO, isoToDate, todayISO } from "@/lib/dates";
import type { OrgContext } from "@/lib/permissions";

export type SuggestionKind = "GAP" | "LAST_MINUTE" | "HIGH_DEMAND" | "LOW_DEMAND" | "ACHIEVED_RATE";

export interface PriceSuggestion {
  propertyId: string;
  propertyName: string;
  kind: SuggestionKind;
  title: string;
  detail: string;
  /** Suggested nightly price, when the suggestion is a price. */
  price?: number;
  from?: string;
  to?: string;
}

const HORIZON = 60;
const round = (n: number) => Math.round(n);
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/**
 * Price ideas from the calendar, explained so the host decides: short gaps
 * between stays that nobody will book at full price, empty nights in the next
 * week, busy or quiet months ahead, and what recent stays actually earned.
 * Prices are set on each platform (no channel connection).
 */
export async function priceSuggestions(ctx: OrgContext, opts: { propertyId?: string } = {}, now = new Date()): Promise<PriceSuggestion[]> {
  const today = todayISO(now);
  const end = addDaysISO(today, HORIZON);
  const properties = await db.property.findMany({
    where: { organizationId: ctx.organizationId, status: "ACTIVE", ...(opts.propertyId ? { id: opts.propertyId } : {}) },
    include: {
      reservations: {
        where: { status: { in: ["CONFIRMED", "COMPLETED"] }, checkOut: { gt: isoToDate(addDaysISO(today, -90)) }, checkIn: { lt: isoToDate(end) } },
        select: { checkIn: true, checkOut: true, totalAmount: true, complimentary: true },
        orderBy: { checkIn: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const out: PriceSuggestion[] = [];
  for (const p of properties) {
    const base = Number(p.basePrice);
    const stays = p.reservations.map((r) => ({ from: dateToISO(r.checkIn), to: dateToISO(r.checkOut), amount: Number(r.totalAmount), free: r.complimentary }));
    const booked = (day: string) => stays.some((s) => s.from <= day && day < s.to);
    const add = (s: Omit<PriceSuggestion, "propertyId" | "propertyName">) => out.push({ propertyId: p.id, propertyName: p.name, ...s });

    // Free runs of nights in the horizon.
    const runs: { from: string; to: string; nights: number; between: boolean }[] = [];
    let start: string | null = null;
    for (let i = 0; i <= HORIZON; i++) {
      const day = addDaysISO(today, i);
      const free = i < HORIZON && !booked(day);
      if (free && !start) start = day;
      if (!free && start) {
        const before = booked(addDaysISO(start, -1));
        runs.push({ from: start, to: day, nights: diffDaysISO(start, day), between: before && i < HORIZON });
        start = null;
      }
    }

    // 1. Gaps of 1–2 nights between two stays.
    for (const r of runs.filter((x) => x.between && x.nights <= 2)) {
      add({
        kind: "GAP",
        title: `Κενό ${r.nights === 1 ? "1 νύχτας" : "2 νυχτών"} ${dm(r.from)}–${dm(r.to)}`,
        detail: `Βρίσκεται ανάμεσα σε δύο κρατήσεις και σπάνια κλείνει στην κανονική τιμή. Ρίξτε την τιμή ~20% για αυτές τις νύχτες και επιτρέψτε ελάχιστη διαμονή ${r.nights} ${r.nights === 1 ? "νύχτας" : "νυχτών"}.`,
        price: round(base * 0.8),
        from: r.from,
        to: r.to,
      });
    }

    // 2. Empty nights in the next 7 days (not already counted as a gap).
    const week = addDaysISO(today, 7);
    const lastMinute = runs.filter((r) => r.from < week && !(r.between && r.nights <= 2));
    const lastMinuteNights = lastMinute.reduce((a, r) => a + diffDaysISO(r.from, r.to < week ? r.to : week), 0);
    if (lastMinuteNights >= 2) {
      add({
        kind: "LAST_MINUTE",
        title: `${lastMinuteNights} ελεύθερες νύχτες την επόμενη εβδομάδα`,
        detail: "Οι νύχτες που μένουν κενές χάνονται. Μια έκπτωση last-minute ~15% για τις επόμενες 7 ημέρες συνήθως τις γεμίζει.",
        price: round(base * 0.85),
        from: today,
        to: week,
      });
    }

    // 3–4. Demand over the next 30 days.
    let bookedNights = 0;
    for (let i = 0; i < 30; i++) if (booked(addDaysISO(today, i))) bookedNights++;
    const occupancy = bookedNights / 30;
    if (occupancy >= 0.8) {
      add({
        kind: "HIGH_DEMAND",
        title: `Πληρότητα ${Math.round(occupancy * 100)}% τις επόμενες 30 ημέρες`,
        detail: "Η ζήτηση είναι υψηλή: ανεβάστε την τιμή ~10% για τις ημερομηνίες που μένουν ελεύθερες και τις επόμενες εβδομάδες.",
        price: round(base * 1.1),
      });
    } else if (occupancy < 0.3) {
      add({
        kind: "LOW_DEMAND",
        title: `Πληρότητα μόλις ${Math.round(occupancy * 100)}% τις επόμενες 30 ημέρες`,
        detail: "Δοκιμάστε έκπτωση ~10%, εβδομαδιαία έκπτωση για 7+ νύχτες ή μικρότερη ελάχιστη διαμονή.",
        price: round(base * 0.9),
      });
    }

    // 5. What the last 90 days actually earned per night.
    const past = stays.filter((s) => s.to <= today && !s.free && s.amount > 0);
    const nights = past.reduce((a, s) => a + diffDaysISO(s.from, s.to), 0);
    if (nights >= 5 && base > 0) {
      const adr = past.reduce((a, s) => a + s.amount, 0) / nights;
      const diff = (adr - base) / base;
      if (Math.abs(diff) >= 0.1) {
        add({
          kind: "ACHIEVED_RATE",
          title: `Οι πρόσφατες κρατήσεις έβγαλαν ${round(adr)} €/νύχτα`,
          detail: `${diff > 0 ? "Πάνω" : "Κάτω"} κατά ${Math.round(Math.abs(diff) * 100)}% από τη βασική τιμή (${round(base)} €). ${diff > 0 ? "Μπορείτε να ανεβάσετε τη βασική τιμή." : "Ίσως η βασική τιμή είναι υψηλή για την αγορά — ή οι εκπτώσεις στις πλατφόρμες είναι μεγάλες."}`,
          price: round(adr),
        });
      }
    }
  }
  return out;
}
