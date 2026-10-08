import { addDaysISO, todayISO, zonedDateTime } from "@/lib/dates";
import { formatMoney, formatPercent, formatTime } from "@/lib/format";
import type { AttentionItem } from "@/lib/services/dashboard";
import type { RevenueSummary } from "@/lib/services/financials";
import type { GuestListItem } from "@/lib/services/guests";
import type { PropertyDTO, ReservationDTO, TaskDTO } from "@/lib/services/serializers";
import type { AIActionDTO } from "./actions";
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
  const reply = await answer(text.toLowerCase(), text, call, tc);
  return { reply, trace };
}

type Call = <T>(name: string, args?: Record<string, unknown>) => Promise<T>;

const has = (t: string, ...words: string[]) => words.some((w) => t.includes(w));
const list = (items: string[]) => items.map((s, i) => `${i + 1}. ${s}`).join("\n");
const stay = (r: ReservationDTO) => `${r.guestName} at ${r.propertyName} (${r.checkIn} → ${r.checkOut}, ${r.guestsCount} guests)`;

async function answer(t: string, original: string, call: Call, tc: ToolContext): Promise<string> {
  const today = todayISO(tc.now);

  if (has(t, "send", "message", "write to")) return draftMessage(original, call, tc);
  if (has(t, "create task", "add task", "new task", "schedule clean", "schedule a clean", "book a clean", "remind"))
    return proposeTask(t, call, tc);

  if (has(t, "aade", "ααδε", "tax", "φόρ", "φορ", "τακκ", "takk", "climate fee", "τέλος", "declar", "δήλωσ", "δηλωσ", "vat", "φπα", "e2", "ε2")) {
    return taxSummary(call);
  }

  if (has(t, "check in", "check-in", "checkin", "checks in", "arriv")) {
    const day = has(t, "tomorrow") ? addDaysISO(today, 1) : has(t, "today") ? today : null;
    const window = day ? (day === today ? 0 : 1) : 7;
    const { reservations } = await call<{ reservations: ReservationDTO[] }>("get_upcoming_checkins", { days: window });
    const rows = day ? reservations.filter((r) => r.checkIn === day) : reservations;
    const label = day === today ? "today" : day ? "tomorrow" : "in the next 7 days";
    if (!rows.length) return `No check-ins ${label}.`;
    return `${rows.length} check-in${rows.length > 1 ? "s" : ""} ${label}:\n\n${list(rows.map(stay))}`;
  }

  if (has(t, "check out", "check-out", "checkout", "checks out", "depart", "leav")) {
    const day = has(t, "tomorrow") ? addDaysISO(today, 1) : has(t, "today") ? today : null;
    const { reservations } = await call<{ reservations: ReservationDTO[] }>("get_upcoming_checkouts", {
      days: day ? (day === today ? 0 : 1) : 7,
    });
    const rows = day ? reservations.filter((r) => r.checkOut === day) : reservations;
    const label = day === today ? "today" : day ? "tomorrow" : "in the next 7 days";
    if (!rows.length) return `No check-outs ${label}.`;
    return `${rows.length} check-out${rows.length > 1 ? "s" : ""} ${label}:\n\n${list(rows.map(stay))}`;
  }

  if (has(t, "overdue", "late task")) {
    const { tasks } = await call<{ tasks: TaskDTO[] }>("get_overdue_tasks");
    if (!tasks.length) return "Nothing is overdue. 🎉";
    return `${tasks.length} overdue task${tasks.length > 1 ? "s" : ""}:\n\n${list(
      tasks.map((x) => `${x.title} — ${x.propertyName} (${x.priority.toLowerCase()}, due ${x.dueAt?.slice(0, 10)})`),
    )}`;
  }

  if (has(t, "best", "perform", "top property", "most profitable", "worst")) {
    const s = await call<RevenueSummary>("get_revenue_summary", periodArgs(t, today));
    const ranked = s.byProperty.filter((p) => p.status === "ACTIVE");
    if (!ranked.length) return "You don't have any active properties yet.";
    return `Property performance ${periodLabel(t)} (by net income):\n\n${list(
      ranked.map(
        (p) =>
          `${p.name} — net ${formatMoney(p.net, s.currency)} (income ${formatMoney(p.income, s.currency)}, occupancy ${formatPercent(p.occupancy)})`,
      ),
    )}\n\nTop performer: **${ranked[0].name}**.`;
  }

  if (has(t, "revenue", "make", "made", "earn", "income", "money", "profit", "expense", "occupancy")) {
    const s = await call<RevenueSummary>("get_revenue_summary", periodArgs(t, today));
    return [
      `Financials ${periodLabel(t)} (${s.from} → ${addDaysISO(s.to, -1)}):`,
      "",
      `• Income: ${formatMoney(s.income, s.currency)}`,
      `• Expenses: ${formatMoney(s.expenses, s.currency)}`,
      `• Net: ${formatMoney(s.net, s.currency)}`,
      `• Occupancy: ${formatPercent(s.occupancy)} (${s.bookedNights}/${s.availableNights} nights)`,
    ].join("\n");
  }

  if (has(t, "propert", "villa", "apartment", "listing")) {
    const { properties } = await call<{ properties: PropertyDTO[] }>("list_properties");
    if (!properties.length) return "You have no properties yet.";
    return `You have ${properties.length} properties:\n\n${list(
      properties.map((p) => `${p.name} — ${p.city} · sleeps ${p.maxGuests} · ${p.status.toLowerCase()}`),
    )}`;
  }

  if (has(t, "guest", "who is")) {
    const q = original.replace(/.*(guest|who is)\s*/i, "").replace(/[?.!]/g, "").trim();
    const { guests } = await call<{ guests: GuestListItem[] }>("list_guests", q ? { q } : {});
    if (!guests.length) return q ? `I couldn't find a guest matching "${q}".` : "You have no guests yet.";
    return `${guests.length} guest${guests.length > 1 ? "s" : ""}${q ? ` matching "${q}"` : ""}:\n\n${list(
      guests
        .slice(0, 10)
        .map((g) => `${g.fullName}${g.country ? ` (${g.country})` : ""} — ${g.stays} stays, ${formatMoney(g.totalRevenue)}`),
    )}`;
  }

  if (has(t, "today", "attention", "to do", "todo", "need", "agenda", "summary", "priorit", "happening")) {
    return todaySummary(call);
  }

  return [
    "I can answer from your live data. Try:",
    "",
    "• What needs my attention today?",
    "• Who checks in tomorrow?",
    "• How much did I make this month?",
    "• Which property performs best?",
    "• Send check-in instructions to <guest name>",
    "• Schedule a cleaning at <property> tomorrow",
    "",
    "_Running in offline mode — set AI_API_KEY for free-form questions._",
  ].join("\n");
}

function periodArgs(t: string, today: string) {
  const [y, m] = today.split("-").map(Number);
  if (has(t, "last month")) {
    const prev = m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, "0")}-01`;
    return { from: prev, to: `${y}-${String(m).padStart(2, "0")}-01` };
  }
  if (has(t, "this year", "year to date", "ytd")) return { from: `${y}-01-01`, to: addDaysISO(today, 1) };
  return {};
}
const periodLabel = (t: string) =>
  has(t, "last month") ? "last month" : has(t, "this year", "year to date", "ytd") ? "this year" : "this month";

async function taxSummary(call: Call) {
  const o = await call<{
    regime: string;
    pendingStayDeclarations: { guest: string; property: string; deadline: string; overdue: boolean }[];
    climateFeeByMonth: { period: string; amount: number; deadline: string; filed: boolean }[];
    warnings: { title: string }[];
  }>("get_tax_obligations");
  const lines = [
    ...o.pendingStayDeclarations.map((d) => `Stay declaration: ${d.guest} at ${d.property} — ${d.overdue ? "**overdue**" : `due ${d.deadline}`}`),
    ...o.climateFeeByMonth.filter((m) => !m.filed).map((m) => `Climate fee (ΤΑΚΚ) ${m.period}: €${m.amount}, due ${m.deadline}`),
    ...o.warnings.map((w) => w.title),
  ];
  const regime = o.regime === "BUSINESS" ? "business (VAT 13% + 0.5% presence fee)" : "individual (property income, Ε2)";
  if (!lines.length) return `Nothing is pending with AADE. Tax regime: ${regime}.`;
  return `AADE obligations — regime: ${regime}\n\n${list(lines.slice(0, 15))}\n\n_Confirm amounts with your accountant._`;
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
    ...d.tasksDueToday.map((x) => `${x.propertyName} — ${x.title}${x.dueAt ? ` at ${formatTime(x.dueAt)}` : ""}`),
    ...d.checkIns.map((r) => `${r.propertyName} — check-in: ${r.guestName}`),
    ...d.checkOuts.map((r) => `${r.propertyName} — check-out: ${r.guestName}`),
    ...d.needsAttention.map((a) => a.title),
  ];
  if (!items.length) return "Nothing needs your attention today. Enjoy the quiet day!";
  return `You have ${items.length} item${items.length > 1 ? "s" : ""} requiring attention today:\n\n${list(items)}`;
}

async function findGuest(original: string, call: Call) {
  const words = original
    .replace(/[^\p{L}\s'-]/gu, " ")
    .split(/\s+/)
    .filter((w) => /^\p{Lu}/u.test(w) && w.length > 1);
  for (const candidate of [words.join(" "), ...words]) {
    if (!candidate) continue;
    const { guests } = await call<{ guests: GuestListItem[] }>("list_guests", { q: candidate });
    if (guests.length === 1) return { guest: guests[0], ambiguous: [] as GuestListItem[] };
    if (guests.length > 1) return { guest: null, ambiguous: guests };
  }
  return { guest: null, ambiguous: [] as GuestListItem[] };
}

async function draftMessage(original: string, call: Call, tc: ToolContext) {
  const { guest, ambiguous } = await findGuest(original, call);
  if (!guest) {
    if (ambiguous.length)
      return `Several guests match — which one?\n\n${list(ambiguous.slice(0, 5).map((g) => g.fullName))}`;
    return "Which guest should I write to? Mention their name, e.g. “Send check-in instructions to Maria Papadopoulou”.";
  }
  const today = todayISO(tc.now);
  const { reservations } = await call<{ reservations: ReservationDTO[] }>("list_reservations", {
    q: guest.lastName,
    from: today,
  });
  const reservation = reservations
    .filter((r) => r.guestId === guest.id && r.status !== "CANCELLED")
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0];
  const lower = original.toLowerCase();
  const message = reservation
    ? has(lower, "check-in", "check in", "instruction", "arriv")
      ? `Hi ${guest.firstName},\n\nWe're looking forward to welcoming you at ${reservation.propertyName} on ${reservation.checkIn}. Check-in is from 15:00. We'll share the door code and directions on the morning of your arrival — just reply here with your expected arrival time.\n\nSee you soon!`
      : has(lower, "thank", "review", "check-out", "checkout")
        ? `Hi ${guest.firstName},\n\nThank you for staying at ${reservation.propertyName}! We hope you had a wonderful time. If you enjoyed your stay, we'd really appreciate a review.\n\nWarm regards`
        : `Hi ${guest.firstName},\n\nJust checking in about your stay at ${reservation.propertyName} (${reservation.checkIn} → ${reservation.checkOut}). Let us know if there's anything you need.\n\nBest regards`
    : `Hi ${guest.firstName},\n\nThank you for being our guest. Let us know if there's anything we can help with.\n\nBest regards`;
  const result = await call<{ proposedAction?: AIActionDTO; error?: string }>("create_message_draft", {
    guestId: guest.id,
    ...(reservation ? { reservationId: reservation.id } : {}),
    message,
  });
  if (!result.proposedAction) return `I couldn't prepare the message: ${result.error ?? "unknown error"}.`;
  return `I've drafted a message to **${guest.fullName}**${
    reservation ? ` about their stay at ${reservation.propertyName}` : ""
  }. Review it below — nothing is sent until you approve it.`;
}

async function proposeTask(t: string, call: Call, tc: ToolContext) {
  const { properties } = await call<{ properties: PropertyDTO[] }>("list_properties", { status: "ACTIVE" });
  const property = properties.find((p) => t.includes(p.name.toLowerCase())) ??
    properties.find((p) => p.name.toLowerCase().split(" ").some((w) => w.length > 3 && t.includes(w)));
  if (!property) {
    return `Which property is this for?\n\n${list(properties.map((p) => p.name))}`;
  }
  const type = has(t, "clean") ? "CLEANING" : has(t, "repair", "fix", "broken", "maint") ? "MAINTENANCE" : has(t, "inspect") ? "INSPECTION" : "OTHER";
  const day = has(t, "tomorrow") ? addDaysISO(todayISO(tc.now), 1) : todayISO(tc.now);
  const dueAt = zonedDateTime(day, type === "CLEANING" ? "11:00" : "10:00").toISOString();
  const title = type === "CLEANING" ? "Turnover cleaning" : type === "MAINTENANCE" ? "Maintenance visit" : type === "INSPECTION" ? "Property inspection" : "Follow-up";
  const result = await call<{ proposedAction?: AIActionDTO; error?: string }>("create_task", {
    propertyId: property.id,
    title,
    type,
    priority: has(t, "urgent", "asap") ? "URGENT" : "MEDIUM",
    dueAt,
  });
  if (!result.proposedAction) return `I couldn't prepare the task: ${result.error ?? "unknown error"}.`;
  return `I've prepared a **${title.toLowerCase()}** task at ${property.name} for ${day}. Approve it below to add it to your task list.`;
}
