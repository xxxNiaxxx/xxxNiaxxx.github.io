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
  currency: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  notes: string | null;
}

export interface Task {
  id: string;
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

export interface SessionInfo {
  user: { id: string; name: string | null; email: string };
  organization: { id: string; name: string };
  role: string;
}
