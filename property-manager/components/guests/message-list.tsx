import { StatusBadge } from "@/components/ui/status";
import { formatDateTime, humanize } from "@/lib/format";
import type { MessageDTO } from "@/lib/services/serializers";
import { cn } from "@/lib/utils";

export function MessageList({ messages }: { messages: MessageDTO[] }) {
  if (!messages.length) return <p className="text-sm text-muted-foreground">No messages yet.</p>;
  return (
    <ul className="grid gap-3">
      {messages.map((m) => (
        <li key={m.id} className={cn("rounded-xl border border-border p-3", m.direction === "OUTBOUND" ? "bg-muted/40" : "bg-surface")}>
          <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>{m.direction === "OUTBOUND" ? "You" : "Guest"} · {humanize(m.channel)} · {formatDateTime(m.sentAt ?? m.createdAt)}</span>
            <StatusBadge value={m.status} />
          </div>
          <p className="text-sm whitespace-pre-line">{m.content}</p>
        </li>
      ))}
    </ul>
  );
}
