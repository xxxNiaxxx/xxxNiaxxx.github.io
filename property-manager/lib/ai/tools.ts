import { z } from "zod";
import { db } from "@/lib/db";
import { addDaysISO, isoToDate, todayISO } from "@/lib/dates";
import { notFound } from "@/lib/errors";
import type { OrgContext } from "@/lib/permissions";
import { getDashboard } from "@/lib/services/dashboard";
import { getRevenueSummary } from "@/lib/services/financials";
import { getGuestDetails, listGuests } from "@/lib/services/guests";
import { getPropertyDetails, listProperties } from "@/lib/services/properties";
import { getReservationDetails, listReservations } from "@/lib/services/reservations";
import { listTasks } from "@/lib/services/tasks";
import { getAnnualReport, getTaxOverview } from "@/lib/services/tax";
import { serializeReservation } from "@/lib/services/serializers";
import { proposeAction } from "./actions";
import type { ToolSpec } from "./provider";

/**
 * The assistant's only window into application data. Every tool receives the
 * server-resolved OrgContext; the model can choose arguments but never the
 * organization, so it cannot reach another tenant's data.
 */
export interface ToolContext {
  org: OrgContext;
  conversationId: string | null;
  now: Date;
}

interface ToolDef<S extends z.ZodObject> {
  name: string;
  description: string;
  input: S;
  run: (input: z.infer<S>, tc: ToolContext) => Promise<unknown>;
}

const tool = <S extends z.ZodObject>(def: ToolDef<S>) => def;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Date as YYYY-MM-DD");

async function upcoming(tc: ToolContext, field: "checkIn" | "checkOut", days: number) {
  const from = todayISO(tc.now);
  const rows = await db.reservation.findMany({
    where: {
      organizationId: tc.org.organizationId,
      status: { in: field === "checkIn" ? ["CONFIRMED", "PENDING"] : ["CONFIRMED", "COMPLETED"] },
      [field]: { gte: isoToDate(from), lt: isoToDate(addDaysISO(from, days + 1)) },
    },
    include: {
      property: { select: { id: true, name: true } },
      guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
    },
    orderBy: { [field]: "asc" },
  });
  return { today: from, through: addDaysISO(from, days), reservations: rows.map(serializeReservation) };
}

async function resolveProperty(tc: ToolContext, args: { propertyId?: string; name?: string }) {
  if (args.propertyId) return args.propertyId;
  if (args.name) {
    const p = await db.property.findFirst({
      where: { organizationId: tc.org.organizationId, name: { contains: args.name, mode: "insensitive" } },
      select: { id: true },
    });
    if (p) return p.id;
  }
  throw notFound("Property");
}

export const tools = [
  tool({
    name: "get_today_summary",
    description:
      "What needs attention today: check-ins, check-outs, today's tasks, overdue tasks, missing information, pending AI actions and headline numbers.",
    input: z.object({}),
    run: async (_i, tc) => {
      const d = await getDashboard(tc.org, tc.now);
      return {
        today: d.today,
        summary: d.summary,
        needsAttention: d.attention,
        checkIns: d.todayAgenda.checkIns,
        checkOuts: d.todayAgenda.checkOuts,
        tasksDueToday: [...d.todayAgenda.cleaning, ...d.todayAgenda.maintenance, ...d.todayAgenda.other],
      };
    },
  }),
  tool({
    name: "get_upcoming_checkins",
    description: "Reservations checking in from today through the next N days (0 = today only, 1 = today and tomorrow).",
    input: z.object({ days: z.number().int().min(0).max(60).default(7) }),
    run: (i, tc) => upcoming(tc, "checkIn", i.days),
  }),
  tool({
    name: "get_upcoming_checkouts",
    description: "Reservations checking out from today through the next N days.",
    input: z.object({ days: z.number().int().min(0).max(60).default(7) }),
    run: (i, tc) => upcoming(tc, "checkOut", i.days),
  }),
  tool({
    name: "get_overdue_tasks",
    description: "Open tasks whose due date has passed.",
    input: z.object({}),
    run: async (_i, tc) => ({ tasks: await listTasks(tc.org, { tab: "overdue" }, tc.now) }),
  }),
  tool({
    name: "list_tasks",
    description: "Tasks filtered by tab (today, upcoming, overdue, completed, all), property or type.",
    input: z.object({
      tab: z.enum(["today", "upcoming", "overdue", "completed", "all"]).default("today"),
      propertyId: z.string().optional(),
      type: z.enum(["CLEANING", "MAINTENANCE", "CHECK_IN", "CHECK_OUT", "INSPECTION", "OTHER"]).optional(),
    }),
    run: async (i, tc) => ({ tasks: (await listTasks(tc.org, i, tc.now)).slice(0, 50) }),
  }),
  tool({
    name: "list_properties",
    description: "All properties with id, name, city, capacity, status and base price.",
    input: z.object({ q: z.string().optional(), status: z.enum(["ACTIVE", "INACTIVE"]).optional() }),
    run: async (i, tc) => ({ properties: await listProperties(tc.org, i) }),
  }),
  tool({
    name: "get_property",
    description: "One property by id or (partial) name, with current and upcoming stays, open tasks and this month's revenue/occupancy.",
    input: z.object({ propertyId: z.string().optional(), name: z.string().optional() }),
    run: async (i, tc) => getPropertyDetails(tc.org, await resolveProperty(tc, i), tc.now),
  }),
  tool({
    name: "list_reservations",
    description: "Search reservations by guest/property/confirmation code, status, property or date window (stays overlapping from..to).",
    input: z.object({
      q: z.string().optional(),
      status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
      propertyId: z.string().optional(),
      from: isoDate.optional(),
      to: isoDate.optional(),
    }),
    run: async (i, tc) => {
      const rows = await listReservations(tc.org, i);
      return { count: rows.length, reservations: rows.slice(0, 40) };
    },
  }),
  tool({
    name: "get_reservation",
    description: "One reservation by id, with its tasks and messages.",
    input: z.object({ reservationId: z.string() }),
    run: (i, tc) => getReservationDetails(tc.org, i.reservationId),
  }),
  tool({
    name: "list_guests",
    description: "Search guests by name, email, phone or country. Returns ids needed by other tools.",
    input: z.object({ q: z.string().optional() }),
    run: async (i, tc) => ({ guests: (await listGuests(tc.org, i)).slice(0, 30) }),
  }),
  tool({
    name: "get_guest",
    description: "One guest by id with contact details, stays, revenue and messages.",
    input: z.object({ guestId: z.string() }),
    run: (i, tc) => getGuestDetails(tc.org, i.guestId),
  }),
  tool({
    name: "get_revenue_summary",
    description:
      "Income, expenses, net and occupancy for a period [from, to) (defaults to the current month), overall and per property. Use for 'how much did I make' and 'which property performs best'.",
    input: z.object({ from: isoDate.optional(), to: isoDate.optional(), propertyId: z.string().optional() }),
    run: (i, tc) => getRevenueSummary(tc.org, i, tc.now),
  }),
  tool({
    name: "get_tax_obligations",
    description:
      "Greek short-term-rental tax obligations: stay declarations to AADE that are due (Δήλωση Βραχυχρόνιας Διαμονής), monthly climate resilience fee (ΤΑΚΚ) amounts and deadlines, VAT/presence fee if a business, compliance gaps (AMA, insurance, safety). Amounts come from configured rules; remind the user to confirm with their accountant.",
    input: z.object({}),
    run: async (_i, tc) => {
      const o = await getTaxOverview(tc.org, tc.now);
      return {
        today: o.today,
        regime: o.regime,
        pendingStayDeclarations: o.pendingDeclarations.slice(0, 20).map((s) => ({ guest: s.guestName, property: s.propertyName, checkOut: s.checkOut, deadline: s.declaration.deadline, overdue: s.declaration.overdue })),
        climateFeeByMonth: o.monthly.filter((m) => m.climateFee > 0).slice(0, 6).map((m) => ({ period: m.period, amount: m.climateFee, deadline: m.climateFeeDeadline, filed: Boolean(m.climateFeeFiled), overdue: m.climateFeeOverdue })),
        warnings: o.warnings,
        compliance: o.compliance.filter((c) => c.missing.length || !c.ama || c.insuranceStatus !== "OK"),
      };
    },
  }),
  tool({
    name: "get_annual_tax_estimate",
    description: "Annual rental income summary for a year: gross, 5% flat deduction and estimated income tax (individual, Ε2) or VAT/presence fee totals (business). An estimate, not tax advice.",
    input: z.object({ year: z.number().int().min(2018).max(2100), otherPropertyIncome: z.number().min(0).optional() }),
    run: (i, tc) => getAnnualReport(tc.org, i.year, i.otherPropertyIncome ?? 0, tc.now),
  }),
  tool({
    name: "create_task",
    description:
      "PROPOSE a new task. It is NOT created until the user approves it in the UI. dueAt is an ISO 8601 date-time with offset.",
    input: z.object({
      propertyId: z.string(),
      reservationId: z.string().optional(),
      title: z.string(),
      description: z.string().optional(),
      type: z.enum(["CLEANING", "MAINTENANCE", "CHECK_IN", "CHECK_OUT", "INSPECTION", "OTHER"]).default("OTHER"),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
      dueAt: z.string().optional(),
    }),
    run: async (i, tc) => ({
      proposedAction: await proposeAction(tc.org, { type: "CREATE_TASK", payload: i, conversationId: tc.conversationId }),
      note: "Proposed only. The user must approve it before the task is created.",
    }),
  }),
  tool({
    name: "create_message_draft",
    description:
      "PROPOSE a message to a guest (e.g. check-in instructions). It is NOT sent until the user approves it in the UI. Look up guestId (and reservationId if relevant) first.",
    input: z.object({ guestId: z.string(), reservationId: z.string().optional(), message: z.string() }),
    run: async (i, tc) => ({
      proposedAction: await proposeAction(tc.org, {
        type: "SEND_GUEST_MESSAGE",
        payload: i,
        conversationId: tc.conversationId,
      }),
      note: "Proposed only. The user must approve it before the message is sent.",
    }),
  }),
] as const;

export type ToolName = (typeof tools)[number]["name"];

export function toolSpecs(): ToolSpec[] {
  return tools.map((t) => {
    const { $schema: _omit, ...parameters } = z.toJSONSchema(t.input, { io: "input" }) as Record<string, unknown>;
    void _omit;
    return { type: "function", function: { name: t.name, description: t.description, parameters } };
  });
}

/** Validates model-supplied arguments and runs a tool inside the caller's organization. */
export async function runTool(name: string, rawArgs: unknown, tc: ToolContext): Promise<unknown> {
  const def = tools.find((t) => t.name === name);
  if (!def) return { error: `Unknown tool ${name}` };
  const parsed = def.input.safeParse(rawArgs ?? {});
  if (!parsed.success) return { error: "Invalid arguments", issues: parsed.error.issues.map((i) => i.message) };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await def.run(parsed.data as any, tc);
  } catch (e) {
    if (e instanceof Error && "code" in e) return { error: e.message };
    throw e;
  }
}
