import { addDaysISO, todayISO, zonedDateTime } from "@/lib/dates";
import { formatDateTime, formatDay, formatMoney, formatPercent, formatTime, humanize } from "@/lib/format";
import type { AttentionItem } from "@/lib/services/dashboard";
import type { RevenueSummary } from "@/lib/services/financials";
import type { GuestListItem } from "@/lib/services/guests";
import type { PropertyDTO, ReservationDTO, TaskDTO } from "@/lib/services/serializers";
import type { AIActionDTO } from "./actions";
import { guestLanguage, languageName } from "@/lib/i18n/guest-language";
import { guestMessageTemplate } from "@/lib/i18n/guest-messages";
import { runTool, type ToolContext } from "./tools";

/**
 * Rule-based assistant used when no AI_API_KEY is configured. It understands
 * a handful of intents and answers ONLY from tool results, so the demo works
 * offline without ever inventing data.
 */
export interface ToolTrace {
  name: string;
  args: unknown;
  result: unknown;
}

export async function runOfflineAssistant(text: string, tc: ToolContext) {
  const trace: ToolTrace[] = [];
  const call = async <T>(name: string, args: Record<string, unknown> = {}) => {
    const result = await runTool(name, args, tc);
    trace.push({ name, args, result });
    return result as T;
  };
  const reply = await answer(normalize(text), text, call, tc);
  return { reply, trace };
}

type Call = <T>(name: string, args?: Record<string, unknown>) => Promise<T>;

/** Lower-case and strip Greek accents so "Αύριο" matches "αυριο". */
export const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
const has = (t: string, ...words: string[]) => words.some((w) => t.includes(w));
const list = (items: string[]) => items.map((s, i) => `${i + 1}. ${s}`).join("\n");
const day = (iso: string) => formatDay(iso);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const stay = (r: ReservationDTO) => `${r.guestName} — ${r.propertyName} (${day(r.checkIn)} → ${day(r.checkOut)}, ${plural(r.guestsCount, "άτομο", "άτομα")})`;

const TOMORROW = ["tomorrow", "αυριο"];
const TODAY = ["today", "σημερα"];

async function answer(t: string, original: string, call: Call, tc: ToolContext): Promise<string> {
  const today = todayISO(tc.now);
  const when = has(t, ...TOMORROW) ? addDaysISO(today, 1) : has(t, ...TODAY) ? today : null;
  const whenLabel = when === today ? "σήμερα" : when ? "αύριο" : "τις επόμενες 7 ημέρες";

  if (has(t, "send", "message", "write to", "στειλ", "μηνυμα", "γραψε", "ενημερωσε τον", "ενημερωσε την"))
    return draftMessage(original, t, call, tc);
  if (has(t, "create task", "add task", "new task", "schedule clean", "schedule a clean", "book a clean", "remind",
    "νεα εργασια", "προσθεσε εργασια", "δημιουργησε εργασια", "προγραμματισ", "κλεισε καθαρισμ", "υπενθυμ"))
    return proposeTask(t, call, tc);

  if (has(t, "aade", "ααδε", "tax", "φορο", "φορολογ", "τακκ", "takk", "climate fee", "τελος ανθεκτ", "declar", "δηλω", "vat", "φπα", "e2", "ε2")) {
    return taxSummary(call);
  }

  if (has(t, "check in", "check-in", "checkin", "checks in", "arriv", "αφιξ", "ερχετ", "ερχοντ", "φτανει", "φτανουν")) {
    const { reservations } = await call<{ reservations: ReservationDTO[] }>("get_upcoming_checkins", { days: when ? (when === today ? 0 : 1) : 7 });
    const rows = when ? reservations.filter((r) => r.checkIn === when) : reservations;
    if (!rows.length) return `Δεν υπάρχουν αφίξεις ${whenLabel}.`;
    return `${plural(rows.length, "άφιξη", "αφίξεις")} ${whenLabel}:\n\n${list(rows.map(stay))}`;
  }

  if (has(t, "check out", "check-out", "checkout", "checks out", "depart", "leav", "αναχωρ", "φευγ")) {
    const { reservations } = await call<{ reservations: ReservationDTO[] }>("get_upcoming_checkouts", { days: when ? (when === today ? 0 : 1) : 7 });
    const rows = when ? reservations.filter((r) => r.checkOut === when) : reservations;
    if (!rows.length) return `Δεν υπάρχουν αναχωρήσεις ${whenLabel}.`;
    return `${plural(rows.length, "αναχώρηση", "αναχωρήσεις")} ${whenLabel}:\n\n${list(rows.map(stay))}`;
  }

  if (has(t, "overdue", "late task", "καθυστερ", "εκπροθεσμ", "εληξε")) {
    const { tasks } = await call<{ tasks: TaskDTO[] }>("get_overdue_tasks");
    if (!tasks.length) return "Καμία εργασία δεν καθυστερεί. 🎉";
    return `${plural(tasks.length, "εργασία καθυστερεί", "εργασίες καθυστερούν")}:\n\n${list(
      tasks.map((x) => `${x.title} — ${x.propertyName} (${humanize(x.priority).toLowerCase()}, προθεσμία ${x.dueAt ? formatDateTime(x.dueAt) : "—"})`),
    )}`;
  }

  if (has(t, "best", "perform", "top property", "most profitable", "worst", "καλυτερ", "αποδιδ", "αποδοση", "χειροτερ", "κερδοφορ")) {
    const s = await call<RevenueSummary>("get_revenue_summary", periodArgs(t, today));
    const ranked = s.byProperty.filter((p) => p.status === "ACTIVE");
    if (!ranked.length) return "Δεν έχετε ενεργά ακίνητα ακόμη.";
    return `Απόδοση ακινήτων ${periodLabel(t)} (κατά καθαρά έσοδα):\n\n${list(
      ranked.map((p) => `${p.name} — καθαρά ${formatMoney(p.net, s.currency)} (έσοδα ${formatMoney(p.income, s.currency)}, πληρότητα ${formatPercent(p.occupancy)})`),
    )}\n\nΚαλύτερη απόδοση: **${ranked[0].name}**.`;
  }

  if (has(t, "revenue", "make", "made", "earn", "income", "money", "profit", "expense", "occupancy",
    "εσοδ", "εβγαλα", "βγαλα", "κερδ", "εξοδ", "πληροτητ", "χρηματ", "τζιρο", "εισπραξ")) {
    const s = await call<RevenueSummary>("get_revenue_summary", periodArgs(t, today));
    return [
      `Οικονομικά ${periodLabel(t)} (${day(s.from)} → ${day(addDaysISO(s.to, -1))}):`,
      "",
      `• Έσοδα: ${formatMoney(s.income, s.currency)}`,
      `• Έξοδα: ${formatMoney(s.expenses, s.currency)}`,
      `• Καθαρά: ${formatMoney(s.net, s.currency)}`,
      `• Πληρότητα: ${formatPercent(s.occupancy)} (${s.bookedNights}/${s.availableNights} νύχτες)`,
    ].join("\n");
  }

  if (has(t, "propert", "villa", "apartment", "listing", "ακινητ", "καταλυμ", "βιλα", "διαμερισμ")) {
    const { properties } = await call<{ properties: PropertyDTO[] }>("list_properties");
    if (!properties.length) return "Δεν έχετε ακίνητα ακόμη.";
    return `Έχετε ${plural(properties.length, "ακίνητο", "ακίνητα")}:\n\n${list(
      properties.map((p) => `${p.name} — ${p.city} · έως ${p.maxGuests} άτομα · ${humanize(p.status).toLowerCase()}`),
    )}`;
  }

  if (has(t, "guest", "who is", "επισκεπτ", "πελατ", "ποιος ειναι", "ποια ειναι")) {
    const q = properNames(original).join(" ");
    const { guests } = await call<{ guests: GuestListItem[] }>("list_guests", q ? { q } : {});
    if (!guests.length) return q ? `Δεν βρήκα επισκέπτη «${q}».` : "Δεν έχετε επισκέπτες ακόμη.";
    return `${plural(guests.length, "επισκέπτης", "επισκέπτες")}${q ? ` για «${q}»` : ""}:\n\n${list(
      guests.slice(0, 10).map((g) => `${g.fullName}${g.country ? ` (${g.country})` : ""} — ${plural(g.stays, "διαμονή", "διαμονές")}, ${formatMoney(g.totalRevenue)}`),
    )}`;
  }

  if (has(t, "today", "attention", "to do", "todo", "need", "agenda", "summary", "priorit", "happening",
    "σημερα", "προσοχ", "τι πρεπει", "εκκρεμ", "προγραμμα", "συνοψ", "τι εχω")) {
    return todaySummary(call);
  }

  return [
    "Απαντώ από τα πραγματικά σας δεδομένα. Δοκιμάστε:",
    "",
    "• Τι χρειάζεται την προσοχή μου σήμερα;",
    "• Ποιος έρχεται αύριο;",
    "• Πόσα έβγαλα αυτόν τον μήνα;",
    "• Ποιο ακίνητο αποδίδει καλύτερα;",
    "• Τι πρέπει να δηλώσω στην ΑΑΔΕ;",
    "• Στείλε οδηγίες άφιξης στη Maria Papadopoulou",
    "• Προγραμμάτισε καθαρισμό στη Villa Elia αύριο",
    "",
    "_Λειτουργία εκτός σύνδεσης — ορίστε AI_API_KEY για ελεύθερες ερωτήσεις._",
  ].join("\n");
}

/** Capitalised words that are not the first word of the sentence — likely names. */
function properNames(original: string) {
  const words = original.replace(/[^\p{L}\s'-]/gu, " ").split(/\s+/).filter(Boolean);
  return words.filter((w, i) => i > 0 && /^\p{Lu}/u.test(w) && w.length > 1);
}

function periodArgs(t: string, today: string) {
  const [y, m] = today.split("-").map(Number);
  if (has(t, "last month", "προηγουμεν", "περασμεν", "περσινο μηνα")) {
    const prev = m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, "0")}-01`;
    return { from: prev, to: `${y}-${String(m).padStart(2, "0")}-01` };
  }
  if (has(t, "this year", "year to date", "ytd", "φετος", "αρχη του ετους", "αρχη της χρονιας", "αυτη τη χρονια")) return { from: `${y}-01-01`, to: addDaysISO(today, 1) };
  return {};
}
const periodLabel = (t: string) =>
  has(t, "last month", "προηγουμεν", "περασμεν") ? "τον προηγούμενο μήνα" : has(t, "this year", "year to date", "ytd", "φετος", "αρχη του ετους", "αρχη της χρονιας", "αυτη τη χρονια") ? "φέτος" : "αυτόν τον μήνα";

async function taxSummary(call: Call) {
  const o = await call<{
    regime: string;
    pendingStayDeclarations: { guest: string; property: string; deadline: string; overdue: boolean }[];
    climateFeeByMonth: { period: string; amount: number; deadline: string; filed: boolean; overdue: boolean }[];
    warnings: { title: string }[];
  }>("get_tax_obligations");
  const lines = [
    ...o.pendingStayDeclarations.map((d) => `Δήλωση διαμονής: ${d.guest}, ${d.property} — ${d.overdue ? "**εκπρόθεσμη**" : `έως ${day(d.deadline)}`}`),
    ...o.climateFeeByMonth.filter((m) => !m.filed).map((m) => `ΤΑΚΚ ${m.period}: ${formatMoney(m.amount)} — ${m.overdue ? "**εκπρόθεσμο**" : `έως ${day(m.deadline)}`}`),
    ...o.warnings.map((w) => w.title),
  ];
  const regime = o.regime === "BUSINESS" ? "επιχείρηση (ΦΠΑ 13% + τέλος παρεπιδημούντων 0,5%)" : "ιδιώτης (εισόδημα από ακίνητα, Ε2)";
  if (!lines.length) return `Δεν εκκρεμεί τίποτα με την ΑΑΔΕ. Καθεστώς: ${regime}.`;
  return `Υποχρεώσεις προς ΑΑΔΕ — καθεστώς: ${regime}\n\n${list(lines.slice(0, 15))}\n\n_Επιβεβαιώστε τα ποσά με τον λογιστή σας._`;
}

async function todaySummary(call: Call) {
  const d = await call<{
    today: string;
    needsAttention: AttentionItem[];
    checkIns: ReservationDTO[];
    checkOuts: ReservationDTO[];
    tasksDueToday: TaskDTO[];
  }>("get_today_summary");
  const items = [
    ...d.tasksDueToday.map((x) => `${x.propertyName} — ${x.title}${x.dueAt ? ` στις ${formatTime(x.dueAt)}` : ""}`),
    ...d.checkIns.map((r) => `${r.propertyName} — άφιξη: ${r.guestName}`),
    ...d.checkOuts.map((r) => `${r.propertyName} — αναχώρηση: ${r.guestName}`),
    ...d.needsAttention.map((a) => a.title),
  ];
  if (!items.length) return "Τίποτα δεν χρειάζεται την προσοχή σας σήμερα. Καλή σας μέρα!";
  return `Έχετε ${plural(items.length, "θέμα", "θέματα")} για σήμερα:\n\n${list(items)}`;
}

async function findGuest(original: string, call: Call) {
  const words = properNames(original);
  for (const candidate of [words.join(" "), ...words]) {
    if (!candidate) continue;
    const { guests } = await call<{ guests: GuestListItem[] }>("list_guests", { q: candidate });
    if (guests.length === 1) return { guest: guests[0], ambiguous: [] as GuestListItem[] };
    if (guests.length > 1) return { guest: null, ambiguous: guests };
  }
  return { guest: null, ambiguous: [] as GuestListItem[] };
}

async function draftMessage(original: string, t: string, call: Call, tc: ToolContext) {
  const { guest, ambiguous } = await findGuest(original, call);
  if (!guest) {
    if (ambiguous.length) return `Ταιριάζουν αρκετοί επισκέπτες — ποιος από αυτούς;\n\n${list(ambiguous.slice(0, 5).map((g) => g.fullName))}`;
    return "Σε ποιον επισκέπτη να γράψω; Αναφέρετε το όνομά του, π.χ. «Στείλε οδηγίες άφιξης στη Maria Papadopoulou».";
  }
  const today = todayISO(tc.now);
  const { reservations } = await call<{ reservations: ReservationDTO[] }>("list_reservations", { q: guest.lastName, from: today });
  const reservation = reservations
    .filter((r) => r.guestId === guest.id && r.status !== "CANCELLED")
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0];
  const lang = guestLanguage(guest);
  const kind = has(t, "check-in", "check in", "instruction", "arriv", "οδηγι", "αφιξ")
    ? "checkin"
    : has(t, "thank", "review", "check-out", "checkout", "ευχαριστ", "κριτικ", "αναχωρ")
      ? "thanks"
      : "general";
  const result = await call<{ proposedAction?: AIActionDTO; error?: string }>("create_message_draft", {
    guestId: guest.id,
    ...(reservation ? { reservationId: reservation.id } : {}),
    message: guestMessageTemplate(kind, lang, {
      name: guest.firstName,
      property: reservation?.propertyName ?? undefined,
      checkIn: reservation?.checkIn,
      checkOut: reservation?.checkOut,
    }),
  });
  if (!result.proposedAction) return `Δεν μπόρεσα να ετοιμάσω το μήνυμα: ${result.error ?? "άγνωστο σφάλμα"}.`;
  return `Ετοίμασα μήνυμα προς **${guest.fullName}**${reservation ? ` για τη διαμονή στο ${reservation.propertyName}` : ""}, στα **${languageName(lang).toLowerCase()}** (γλώσσα του επισκέπτη). Δείτε το παρακάτω — δεν στέλνεται τίποτα χωρίς την έγκρισή σας.`;
}

async function proposeTask(t: string, call: Call, tc: ToolContext) {
  const { properties } = await call<{ properties: PropertyDTO[] }>("list_properties", { status: "ACTIVE" });
  const property =
    properties.find((p) => t.includes(normalize(p.name))) ??
    properties.find((p) => normalize(p.name).split(" ").some((w) => w.length > 3 && t.includes(w)));
  if (!property) return `Για ποιο ακίνητο;\n\n${list(properties.map((p) => p.name))}`;
  const type = has(t, "clean", "καθαρισ")
    ? "CLEANING"
    : has(t, "repair", "fix", "broken", "maint", "επισκευ", "βλαβ", "χαλασ", "συντηρ")
      ? "MAINTENANCE"
      : has(t, "inspect", "επιθεωρ", "ελεγχ")
        ? "INSPECTION"
        : "OTHER";
  const when = has(t, ...TOMORROW) ? addDaysISO(todayISO(tc.now), 1) : todayISO(tc.now);
  const dueAt = zonedDateTime(when, type === "CLEANING" ? "11:00" : "10:00").toISOString();
  const title = { CLEANING: "Καθαρισμός αλλαγής", MAINTENANCE: "Επίσκεψη συντήρησης", INSPECTION: "Επιθεώρηση ακινήτου", OTHER: "Εργασία" }[type];
  const result = await call<{ proposedAction?: AIActionDTO; error?: string }>("create_task", {
    propertyId: property.id,
    title,
    type,
    priority: has(t, "urgent", "asap", "επειγ", "αμεσα") ? "URGENT" : "MEDIUM",
    dueAt,
  });
  if (!result.proposedAction) return `Δεν μπόρεσα να ετοιμάσω την εργασία: ${result.error ?? "άγνωστο σφάλμα"}.`;
  return `Ετοίμασα εργασία **${title.toLowerCase()}** στο ${property.name} για ${formatDay(when, { weekday: "long", day: "numeric", month: "long" })}. Εγκρίνετέ τη παρακάτω για να μπει στις εργασίες.`;
}
