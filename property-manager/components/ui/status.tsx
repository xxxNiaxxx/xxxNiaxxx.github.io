import { Badge, type BadgeTone } from "@/components/ui/badge";
import { humanize } from "@/lib/format";

const tones: Record<string, BadgeTone> = {
  // reservation
  PENDING: "warning",
  CONFIRMED: "success",
  CANCELLED: "neutral",
  COMPLETED: "info",
  // property
  ACTIVE: "success",
  INACTIVE: "neutral",
  // task
  TODO: "neutral",
  IN_PROGRESS: "accent",
  // priority
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "danger",
  // AI action
  PROPOSED: "warning",
  APPROVED: "info",
  EXECUTED: "success",
  REJECTED: "neutral",
  FAILED: "danger",
  // message
  DRAFT: "neutral",
  SENT: "success",
};

export function StatusBadge({ value, label }: { value: string; label?: string }) {
  return (
    <Badge tone={tones[value] ?? "neutral"} dot>
      {label ?? humanize(value)}
    </Badge>
  );
}

export function PriorityBadge({ value }: { value: string }) {
  return <Badge tone={tones[value] ?? "neutral"}>{humanize(value)}</Badge>;
}

export { SOURCE_LABELS } from "@/lib/reservation-sources";
