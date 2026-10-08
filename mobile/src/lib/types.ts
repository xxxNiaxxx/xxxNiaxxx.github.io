/** Shapes returned by the web app's REST API (see property-manager/docs/api.md). */
export interface Reservation {
  id: string;
  propertyId: string;
  propertyName: string | null;
  guestId: string;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  source: string;
  confirmationCode: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestsCount: number;
  totalAmount: number;
  complimentary: boolean;
  fromCalendar: boolean;
  commission: number;
  currency: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  notes: string | null;
  paymentMethod: string | null;
  checkinPath: string | null;
  checkinCompletedAt: string | null;
  arrivalTime: string | null;
  rulesAccepted: boolean;
}

export interface Task {
  id: string;
  assignedToUserId?: string | null;
  propertyId: string;
  propertyName: string | null;
  reservationId: string | null;
  title: string;
  description: string | null;
  type: string;
  status: "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  checklist: { label: string; done: boolean }[];
  dueAt: string | null;
  assigneeName: string | null;
  overdue: boolean;
}

export interface AttentionItem {
  kind: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  href: string;
}

export interface Dashboard {
  today: string;
  summary: {
    properties: number;
    activeProperties: number;
    activeReservations: number;
    checkInsToday: number;
    checkOutsToday: number;
    monthlyRevenue: number;
    occupancy: number;
    currency: string;
  };
  attention: AttentionItem[];
  todayAgenda: { checkIns: Reservation[]; checkOuts: Reservation[]; cleaning: Task[]; maintenance: Task[]; other: Task[] };
  savings?: Savings;
  priceIdeas?: PriceSuggestion[];
}

export interface Message {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  channel: string;
  content: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
}

export interface AIAction {
  id: string;
  conversationId: string | null;
  type: "SEND_GUEST_MESSAGE" | "CREATE_TASK" | string;
  status: "PROPOSED" | "APPROVED" | "EXECUTED" | "REJECTED" | "FAILED";
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ChatResponse {
  conversationId: string;
  mode: "llm" | "offline";
  message: ChatMessage;
  toolsUsed: string[];
  actions: AIAction[];
}

export type Role = "OWNER" | "ADMIN" | "MEMBER";

export interface SessionInfo {
  user: { id: string; name: string | null; email: string };
  organization: { id: string; name: string };
  role: Role;
  organizations: { id: string; name: string; role: Role }[];
}

export interface TaxSettings {
  setting: "AUTO" | "INDIVIDUAL" | "BUSINESS";
  regime: "INDIVIDUAL" | "BUSINESS";
  propertiesWithAma: number;
  commissionRates: Record<string, number>;
  businessTaxRate: number | null;
}

export interface Property {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string;
  country: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  status: "ACTIVE" | "INACTIVE";
  basePrice: number;
  currency: string;
  ama: string | null;
  kind: "APARTMENT" | "DETACHED_HOUSE";
  areaSqm: number | null;
  compliance: Record<string, boolean | string | null>;
  checkInTime: string | null;
  checkOutTime: string | null;
  houseRules: string | null;
  directBooking: boolean;
  publicToken: string | null;
}

export interface PriceSuggestion {
  propertyId: string;
  propertyName: string;
  kind: "GAP" | "LAST_MINUTE" | "HIGH_DEMAND" | "LOW_DEMAND" | "ACHIEVED_RATE";
  title: string;
  detail: string;
  price?: number;
}

export interface Savings {
  year: number;
  declarationsOnTime: number;
  finesAvoided: number;
  doubleBookingsCaught: number;
  directBookings: number;
  commissionSaved: number;
  checkinsCompleted: number;
  aiReplies: number;
  automatedStays: number;
  hoursSaved: number;
}

export interface PropertyDetails {
  property: Property;
  currentReservation: Reservation | null;
  upcomingReservations: Reservation[];
  openTasks: Task[];
  month: { from: string; to: string; income: number; expenses: number; net: number; occupancy: number; bookedNights: number };
}

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  languagePreference: string | null;
  language: string;
  notes: string | null;
  idType: string | null;
  idNumber: string | null;
}

export interface GuestDetails {
  guest: Guest;
  reservations: Reservation[];
  messages: Message[];
  stats: { stays: number; totalRevenue: number; averageStay: number; currency: string };
}

export interface StayTax {
  regime: "INDIVIDUAL" | "BUSINESS";
  totalAmount: number;
  guestTotal: number;
  commission: number;
  commissionRate: number;
  incomeTax: number | null;
  incomeTaxRate: number | null;
  net: number | null;
  ama: string | null;
  complimentary: boolean;
  longStay: boolean;
  climateFee: number;
  climateFeeMonths: { period: string; nights: number; amount: number }[];
  rent: number;
  vat: number;
  presenceFee: number;
  declaration: { required: boolean; status: "PENDING" | "DECLARED" | "NOT_REQUIRED"; triggerDate: string; deadline: string; due: boolean; overdue: boolean; daysLeft: number };
  /** The AADE stay declaration, field by field, ready to copy. */
  declarationForm: { fields: { key: string; label: string; value: string | null; optional?: boolean }[]; missing: string[]; paymentMethodIsDefault: boolean; cancelled: boolean };
}

export interface Transaction {
  id: string;
  propertyId: string;
  propertyName: string | null;
  reservationId: string | null;
  type: "INCOME" | "EXPENSE";
  category: string;
  amount: number;
  currency: string;
  description: string | null;
  transactionDate: string;
}

export interface RevenueSummary {
  from: string;
  to: string;
  currency: string;
  income: number;
  expenses: number;
  net: number;
  occupancy: number;
  bookedNights: number;
  availableNights: number;
  byProperty: { propertyId: string; name: string; income: number; expenses: number; net: number; occupancy: number; bookedNights: number }[];
  byCategory: { category: string; income: number; expenses: number }[];
}

export interface Member {
  userId: string;
  name: string;
  email: string;
  role: Role;
  joinedAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  invitedByName: string | null;
  expiresAt: string;
}

export interface Memory {
  id: string;
  kind: "GUEST_INFO" | "PREFERENCE" | "MESSAGE_TEMPLATE";
  content: string;
  propertyId: string | null;
  propertyName: string | null;
  language: string | null;
  messageKind: string | null;
  source: "MANUAL" | "CHAT" | "EDIT";
  active: boolean;
}

export interface CalendarFeed {
  id: string;
  source: string;
  url: string;
  lastSyncedAt: string | null;
  lastError: string | null;
}

export interface SyncResult {
  created: number;
  updated: number;
  cancelled: number;
  errors?: string[];
  error?: string;
}
