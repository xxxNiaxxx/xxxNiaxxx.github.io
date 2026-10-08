/**
 * Demo data for "Demo Hospitality". Idempotent: removes the demo organization
 * and demo users, then recreates everything with dates around today.
 *
 * Sign in with demo@demo-hospitality.test / demo1234
 */
import { PrismaClient, type PropertyKind, type ReservationStatus, type TaskType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDaysISO, isoToDate, todayISO, zonedDateTime } from "../lib/dates";
import { climateFeeByMonth } from "../lib/tax/gr";

const db = new PrismaClient();

// Deterministic PRNG so the demo looks the same on every machine.
let seed = 42;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
const between = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

const DEMO_USERS = [
  { email: "demo@demo-hospitality.test", name: "Αλέξης Δημητρίου", role: "OWNER" as const },
  { email: "eleni@demo-hospitality.test", name: "Ελένη Μαρκοπούλου", role: "MEMBER" as const },
  { email: "nikos@demo-hospitality.test", name: "Νίκος Αλεξίου", role: "MEMBER" as const },
];

const PROPERTIES = [
  { name: "Villa Elia", ama: "00001842367", kind: "DETACHED_HOUSE", areaSqm: 180, city: "Κασσάνδρα, Χαλκιδική", address: "Οδός Ελαιώνων 12, Πευκοχώρι", bedrooms: 4, bathrooms: 3, maxGuests: 8, basePrice: 320, description: "Πέτρινη βίλα ανάμεσα σε ελαιόδεντρα με ιδιωτική πισίνα, 5 λεπτά από την παραλία." },
  { name: "Sea View Apartment", ama: "00002934715", kind: "APARTMENT", areaSqm: 72, city: "Θεσσαλονίκη", address: "Λεωφόρος Νίκης 41", bedrooms: 2, bathrooms: 1, maxGuests: 4, basePrice: 140, description: "Φωτεινό διαμέρισμα στην παραλία με μπαλκόνι και θέα στον Θερμαϊκό." },
  { name: "Blue Horizon Villa", ama: "00003561208", kind: "DETACHED_HOUSE", areaSqm: 140, city: "Χανιά, Κρήτη", address: "Παραλία Καλαμάκι 7", bedrooms: 3, bathrooms: 2, maxGuests: 6, basePrice: 260, description: "Μοντέρνα βίλα με πισίνα υπερχείλισης και θέα στο Κρητικό Πέλαγος." },
  { name: "Old Town Studio", ama: "00004108932", kind: "APARTMENT", areaSqm: 32, city: "Αθήνα", address: "Αδριανού 88, Πλάκα", bedrooms: 1, bathrooms: 1, maxGuests: 2, basePrice: 95, description: "Ζεστό στούντιο στην Πλάκα με ταράτσα και θέα στην Ακρόπολη." },
  { name: "Sunset Residence", ama: "00005277481", kind: "DETACHED_HOUSE", areaSqm: 95, city: "Σιθωνία, Χαλκιδική", address: "Παραλία Νέου Μαρμαρά 3", bedrooms: 3, bathrooms: 2, maxGuests: 6, basePrice: 210, description: "Κατοικία δίπλα στη θάλασσα, γνωστή για τα ηλιοβασιλέματα με θέα στο Άγιο Όρος." },
] as const satisfies readonly { name: string; kind: PropertyKind; [key: string]: unknown }[];

const GUESTS = [
  ["Maria", "Papadopoulou", "GR"], ["John", "Carter", "GB"], ["Sophie", "Laurent", "FR"], ["Lukas", "Becker", "DE"],
  ["Giulia", "Rossi", "IT"], ["Emma", "Johansson", "SE"], ["Daniel", "Novak", "CZ"], ["Olivia", "Brooks", "US"],
  ["Nikolaos", "Georgiou", "GR"], ["Anna", "Kowalska", "PL"], ["Pieter", "de Vries", "NL"], ["Clara", "Fernández", "ES"],
  ["Thomas", "Müller", "AT"], ["Ioanna", "Dimitriou", "CY"], ["Liam", "O'Connor", "IE"], ["Mila", "Petrović", "RS"],
  ["Hannah", "Schmidt", "DE"], ["Marco", "Bianchi", "IT"], ["Chloé", "Martin", "BE"], ["Ethan", "Walker", "CA"],
] as const;

async function reset() {
  const orgs = await db.organization.findMany({ where: { name: "Demo Hospitality" }, select: { id: true } });
  const orgIds = orgs.map((o) => o.id);
  if (orgIds.length) {
    // Order matters because reservations restrict property/guest deletion.
    await db.aIAction.deleteMany({ where: { organizationId: { in: orgIds } } });
    await db.aIConversation.deleteMany({ where: { organizationId: { in: orgIds } } });
    await db.transaction.deleteMany({ where: { organizationId: { in: orgIds } } });
    await db.message.deleteMany({ where: { organizationId: { in: orgIds } } });
    await db.task.deleteMany({ where: { organizationId: { in: orgIds } } });
    await db.reservation.deleteMany({ where: { organizationId: { in: orgIds } } });
    await db.organization.deleteMany({ where: { id: { in: orgIds } } });
  }
  await db.user.deleteMany({ where: { email: { in: DEMO_USERS.map((u) => u.email) } } });
}

async function main() {
  await reset();
  const today = todayISO();
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const org = await db.organization.create({ data: { name: "Demo Hospitality" } });
  const users = [];
  for (const u of DEMO_USERS) {
    const user = await db.user.create({ data: { email: u.email, name: u.name, passwordHash } });
    await db.organizationMember.create({ data: { organizationId: org.id, userId: user.id, role: u.role } });
    users.push(user);
  }
  const [owner, cleaner, handyman] = users;

  const properties = [];
  const fullCompliance = { fireExtinguisher: true, smokeDetectors: true, firstAidKit: true, emergencyLighting: true, electricianDeclaration: true, amaDisplayed: true };
  for (const [i, p] of PROPERTIES.entries()) {
    // One property has gaps so the compliance screens have something to show.
    const compliance =
      i === 3
        ? { fireExtinguisher: true, smokeDetectors: false, firstAidKit: true, emergencyLighting: false, electricianDeclaration: false, amaDisplayed: true, insuranceExpiresOn: addDaysISO(today, 12) }
        : { ...fullCompliance, insuranceExpiresOn: addDaysISO(today, 120 + i * 30) };
    properties.push(
      await db.property.create({
        data: { ...p, compliance, organizationId: org.id, country: "Ελλάδα", currency: "EUR", status: "ACTIVE" },
      }),
    );
  }

  const guests = [];
  for (const [i, [firstName, lastName, country]] of GUESTS.entries()) {
    const slug = `${firstName}.${lastName}`.toLowerCase().normalize("NFD").replace(/[^a-z.]/g, "");
    guests.push(
      await db.guest.create({
        data: {
          organizationId: org.id,
          firstName,
          lastName,
          country,
          // Two guests intentionally lack contact details to show "missing information".
          email: i === 7 ? null : `${slug}@example.com`,
          phone: i === 7 || i === 15 ? null : `+30 69${String(10000000 + i * 7919).slice(0, 8)}`,
          notes: i % 6 === 0 ? pick(["Επαναλαμβανόμενος επισκέπτης — προτιμά αργή άφιξη.", "Ταξιδεύει με μικρό σκυλάκι.", "Αλλεργία στα πούπουλα: συνθετικά μαξιλάρια.", "Γιορτάζει επέτειο."]) : null,
        },
      }),
    );
  }

  // Build back-to-back-ish stays per property from ~6 weeks ago to ~45 days ahead.
  type Plan = { propertyIndex: number; checkIn: string; checkOut: string };
  const plans: Plan[] = [];
  properties.forEach((_, pi) => {
    let cursor = addDaysISO(today, -42 + pi * 3);
    // Guarantee a check-in today at property 1, a check-out today at property 0, check-in tomorrow at property 2.
    while (cursor < addDaysISO(today, 45)) {
      const nights = between(2, pi === 0 || pi === 2 ? 7 : 5);
      plans.push({ propertyIndex: pi, checkIn: cursor, checkOut: addDaysISO(cursor, nights) });
      cursor = addDaysISO(cursor, nights + between(0, 4));
    }
  });
  const forced: Plan[] = [
    { propertyIndex: 0, checkIn: addDaysISO(today, -4), checkOut: today },
    { propertyIndex: 1, checkIn: today, checkOut: addDaysISO(today, 3) },
    { propertyIndex: 2, checkIn: addDaysISO(today, 1), checkOut: addDaysISO(today, 6) },
    { propertyIndex: 3, checkIn: addDaysISO(today, -2), checkOut: addDaysISO(today, 1) },
    { propertyIndex: 4, checkIn: addDaysISO(today, 2), checkOut: addDaysISO(today, 7) },
  ];
  const overlaps = (a: Plan, b: Plan) => a.propertyIndex === b.propertyIndex && a.checkIn < b.checkOut && b.checkIn < a.checkOut;
  const finalPlans = [...forced, ...plans.filter((p) => !forced.some((f) => overlaps(f, p)))]
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  // Keep the demo inside the 20–40 range.
  const past = finalPlans.filter((p) => !forced.includes(p) && p.checkOut <= today && p.checkIn >= addDaysISO(today, -40));
  const future = finalPlans.filter((p) => !forced.includes(p) && p.checkOut > today && p.checkIn < addDaysISO(today, 35));
  const selected = [...forced, ...past.filter((_, i) => i % 2 === 0).slice(-16), ...future.slice(0, 19)]
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  let code = 4100;
  const reservations = [];
  for (const [i, plan] of selected.entries()) {
    const property = properties[plan.propertyIndex];
    const guest = guests[i % guests.length];
    const nights = Math.round((isoToDate(plan.checkOut).getTime() - isoToDate(plan.checkIn).getTime()) / 86_400_000);
    let status: ReservationStatus = plan.checkOut <= today ? "COMPLETED" : "CONFIRMED";
    const isForced = forced.includes(plan);
    if (!isForced && plan.checkIn > addDaysISO(today, 20) && i % 5 === 0) status = "PENDING";
    if (!isForced && i % 13 === 7) status = "CANCELLED";
    const missingCode = plan.propertyIndex === 4 && plan.checkIn === addDaysISO(today, 2);
    const r = await db.reservation.create({
      data: {
        organizationId: org.id,
        propertyId: property.id,
        guestId: guest.id,
        source: i % 7 === 3 ? "DIRECT" : "MANUAL",
        confirmationCode: missingCode ? null : `DH-${code++}`,
        checkIn: isoToDate(plan.checkIn),
        checkOut: isoToDate(plan.checkOut),
        guestsCount: Math.min(property.maxGuests, between(1, property.maxGuests)),
        totalAmount: Math.round(Number(property.basePrice) * nights * (0.9 + rand() * 0.3)),
        currency: "EUR",
        status,
        notes: i % 9 === 0 ? "Ζήτησε βρεφικό κρεβάτι." : null,
      },
    });
    reservations.push(r);
  }

  // One free stay for relatives: no rent, no ΤΑΚΚ, no AADE declaration.
  const freeIndex = reservations.findIndex((r, i) => !forced.includes(selected[i]) && r.status === "CONFIRMED" && r.checkIn > isoToDate(addDaysISO(today, 7)));
  if (freeIndex >= 0) {
    reservations[freeIndex] = await db.reservation.update({
      where: { id: reservations[freeIndex].id },
      data: { complimentary: true, totalAmount: 0, source: "DIRECT", declarationStatus: "NOT_REQUIRED", notes: "Δωρεάν φιλοξενία — συγγενείς του ιδιοκτήτη." },
    });
  }

  // AADE stay declarations: everything that left before this month is declared; recent departures are pending.
  const monthStart = `${today.slice(0, 7)}-01`;
  for (const r of reservations) {
    const out = r.checkOut.toISOString().slice(0, 10);
    if (r.status === "CANCELLED") {
      await db.reservation.update({ where: { id: r.id }, data: { cancelledAt: new Date(r.checkIn.getTime() - 20 * 86_400_000), declarationStatus: "NOT_REQUIRED" } });
    } else if (out < monthStart) {
      await db.reservation.update({ where: { id: r.id }, data: { declarationStatus: "DECLARED", declaredAt: new Date(r.checkOut.getTime() + 5 * 86_400_000) } });
    }
  }

  // Monthly ΤΑΚΚ returns already filed for every month before last month.
  const lastMonthStart = (() => { const d = new Date(isoToDate(monthStart)); d.setUTCMonth(d.getUTCMonth() - 1); return d.toISOString().slice(0, 10); })();
  const feeByPeriod = new Map<string, number>();
  for (const r of reservations) {
    if (r.status !== "CONFIRMED" && r.status !== "COMPLETED") continue;
    const property = properties.find((p) => p.id === r.propertyId)!;
    for (const part of climateFeeByMonth(
      { checkIn: r.checkIn.toISOString().slice(0, 10), checkOut: r.checkOut.toISOString().slice(0, 10), totalAmount: Number(r.totalAmount) },
      { kind: property.kind, areaSqm: property.areaSqm },
    )) {
      if (`${part.period}-01` < lastMonthStart) feeByPeriod.set(part.period, (feeByPeriod.get(part.period) ?? 0) + part.amount);
    }
  }
  for (const [period, amount] of feeByPeriod) {
    await db.taxFiling.create({ data: { organizationId: org.id, kind: "CLIMATE_FEE", period, amount, reference: "myAADE" } });
  }

  // What the AI assistant has been taught by the team.
  await db.aIMemory.createMany({
    data: [
      { organizationId: org.id, propertyId: properties[0].id, kind: "GUEST_INFO", language: "el", source: "MANUAL", content: "Wi-Fi: VillaElia_Guest — κωδικός elia2026", createdByUserId: owner.id },
      { organizationId: org.id, propertyId: properties[0].id, kind: "GUEST_INFO", language: "el", source: "CHAT", content: "Το πάρκινγκ είναι μπροστά από την κεντρική πύλη.", createdByUserId: owner.id },
      { organizationId: org.id, propertyId: properties[0].id, kind: "GUEST_INFO", language: null, source: "MANUAL", content: "Wi-Fi: VillaElia_Guest — password elia2026", createdByUserId: owner.id },
      { organizationId: org.id, propertyId: properties[3].id, kind: "GUEST_INFO", language: null, source: "MANUAL", content: "The key box is on the left of the entrance door, code 4821.", createdByUserId: owner.id },
      { organizationId: org.id, kind: "PREFERENCE", language: "el", source: "MANUAL", content: "Υπογράφουμε τα μηνύματα: «Η ομάδα του Demo Hospitality».", createdByUserId: owner.id },
      { organizationId: org.id, kind: "PREFERENCE", language: "el", source: "CHAT", content: "Οι καθαρισμοί αλλαγής γίνονται πάντα μετά τις 11:00.", createdByUserId: owner.id },
    ],
  });

  // Income for booked stays + expenses.
  for (const r of reservations) {
    if ((r.status !== "CONFIRMED" && r.status !== "COMPLETED") || r.complimentary) continue;
    await db.transaction.create({
      data: {
        organizationId: org.id, propertyId: r.propertyId, reservationId: r.id, type: "INCOME", category: "BOOKING",
        amount: r.totalAmount, currency: "EUR", transactionDate: r.checkIn, description: `Κράτηση ${r.confirmationCode ?? ""}`.trim(),
      },
    });
    if (r.checkOut <= isoToDate(today)) {
      await db.transaction.create({
        data: {
          organizationId: org.id, propertyId: r.propertyId, reservationId: r.id, type: "EXPENSE", category: "CLEANING",
          amount: between(45, 90), currency: "EUR", transactionDate: r.checkOut, description: "Καθαρισμός αλλαγής",
        },
      });
    }
  }
  for (const property of properties) {
    for (const monthsAgo of [2, 1, 0]) {
      const d = new Date(isoToDate(today));
      d.setUTCMonth(d.getUTCMonth() - monthsAgo, 5);
      const date = d.toISOString().slice(0, 10);
      if (date > today) continue;
      await db.transaction.create({
        data: { organizationId: org.id, propertyId: property.id, type: "EXPENSE", category: "UTILITIES", amount: between(80, 220), currency: "EUR", transactionDate: isoToDate(date), description: "Ρεύμα & νερό" },
      });
      await db.transaction.create({
        data: { organizationId: org.id, propertyId: property.id, type: "EXPENSE", category: "SUPPLIES", amount: between(25, 90), currency: "EUR", transactionDate: isoToDate(addDaysISO(date, 9) > today ? date : addDaysISO(date, 9)), description: "Είδη μπάνιου, καφές & λευκά είδη" },
      });
    }
  }
  await db.transaction.create({
    data: { organizationId: org.id, propertyId: properties[2].id, type: "EXPENSE", category: "MAINTENANCE", amount: 340, currency: "EUR", transactionDate: isoToDate(addDaysISO(today, -12)), description: "Επισκευή αντλίας πισίνας" },
  });

  // Tasks: turnover cleaning on check-out days, plus maintenance and inspections.
  const cleaningChecklist = (doneAll: boolean) =>
    ["Αλλαγή κλινοσκεπασμάτων", "Καθαρισμός μπάνιων", "Καθαρισμός κουζίνας και ψυγείου", "Σκούπισμα και σφουγγάρισμα", "Αναπλήρωση ειδών μπάνιου και καφέ", "Απομάκρυνση σκουπιδιών"].map((label) => ({ label, done: doneAll }));
  let taskCount = 0;
  for (const r of reservations) {
    if (r.status === "CANCELLED") continue;
    const out = r.checkOut.toISOString().slice(0, 10);
    if (out < addDaysISO(today, -14) || out > addDaysISO(today, 10)) continue;
    // Leave Sunset Residence's next turnover unscheduled so the dashboard flags it.
    if (r.propertyId === properties[4].id && out >= today) continue;
    const done = out < today;
    await db.task.create({
      data: {
        organizationId: org.id, propertyId: r.propertyId, reservationId: r.id, title: "Καθαρισμός αλλαγής", type: "CLEANING",
        status: done ? "COMPLETED" : "TODO", priority: out === today ? "HIGH" : "MEDIUM", dueAt: zonedDateTime(out, "12:00"),
        completedAt: done ? zonedDateTime(out, "14:30") : null, assignedToUserId: cleaner.id, checklist: cleaningChecklist(done),
      },
    });
    taskCount++;
  }
  const extra: { p: number; title: string; type: TaskType; day: number; time: string; priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"; who?: string; status?: "TODO" | "IN_PROGRESS" | "COMPLETED"; description?: string }[] = [
    { p: 2, title: "Επισκευή διαρροής στο εξωτερικό ντους", type: "MAINTENANCE", day: -3, time: "10:00", priority: "HIGH", who: handyman.id, description: "Ο επισκέπτης ανέφερε ότι στάζει η βρύση στο ντους της πισίνας." },
    { p: 0, title: "Αλλαγή φίλτρου κλιματιστικού στο κυρίως υπνοδωμάτιο", type: "MAINTENANCE", day: -1, time: "09:00", priority: "MEDIUM", who: handyman.id },
    { p: 3, title: "Αναπλήρωση καλαθιού καλωσορίσματος", type: "OTHER", day: 0, time: "13:00", priority: "LOW", who: cleaner.id },
    { p: 1, title: "Υποδοχή επισκέπτη", type: "CHECK_IN", day: 0, time: "15:00", priority: "HIGH", who: owner.id },
    { p: 0, title: "Καθαρισμός πισίνας", type: "MAINTENANCE", day: 0, time: "09:30", priority: "MEDIUM", who: handyman.id, status: "IN_PROGRESS" },
    { p: 2, title: "Έλεγχος πριν την άφιξη", type: "INSPECTION", day: 1, time: "11:00", priority: "MEDIUM", who: owner.id },
    { p: 4, title: "Συντήρηση θερμοσίφωνα", type: "MAINTENANCE", day: 5, time: "10:00", priority: "LOW", who: handyman.id },
    { p: 3, title: "Έλεγχος μετά την αναχώρηση", type: "CHECK_OUT", day: 1, time: "11:00", priority: "MEDIUM", who: cleaner.id },
    { p: 1, title: "Τριμηνιαίος έλεγχος ανιχνευτών καπνού", type: "INSPECTION", day: 9, time: "10:00", priority: "LOW" },
    { p: 0, title: "Κλάδεμα κήπου και ελιών", type: "MAINTENANCE", day: -8, time: "08:00", priority: "LOW", who: handyman.id, status: "COMPLETED" },
    { p: 4, title: "Αντικατάσταση σπασμένης ξαπλώστρας", type: "MAINTENANCE", day: -2, time: "12:00", priority: "URGENT" },
  ];
  for (const t of extra) {
    const day = addDaysISO(today, t.day);
    await db.task.create({
      data: {
        organizationId: org.id, propertyId: properties[t.p].id, title: t.title, type: t.type, priority: t.priority,
        status: t.status ?? "TODO", dueAt: zonedDateTime(day, t.time), assignedToUserId: t.who ?? null,
        description: t.description ?? null, completedAt: t.status === "COMPLETED" ? zonedDateTime(day, "16:00") : null,
      },
    });
    taskCount++;
  }

  // A few sent messages for past stays (simulated INTERNAL channel).
  for (const r of reservations.filter((x) => x.status === "COMPLETED").slice(-6)) {
    await db.message.create({
      data: {
        organizationId: org.id, reservationId: r.id, guestId: r.guestId, direction: "OUTBOUND", channel: "INTERNAL", status: "SENT",
        content: "Γεια σας! Οδηγίες άφιξης: αυτόνομο check-in από τις 15:00· τον κωδικό της κλειδοθήκης θα τον λάβετε την ημέρα της άφιξης. Καλό ταξίδι!",
        sentAt: new Date(r.checkIn.getTime() - 86_400_000), createdAt: new Date(r.checkIn.getTime() - 86_400_000),
      },
    });
  }

  console.log(
    `Seeded Demo Hospitality: ${properties.length} properties, ${guests.length} guests, ${reservations.length} reservations, ${taskCount} tasks.`,
  );
  console.log("Σύνδεση: demo@demo-hospitality.test / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
